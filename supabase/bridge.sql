-- Dovetail Builder: sessions in which Claude edits an open canvas.
--
-- A signed-in person starts a session from the Builder. The Builder keeps a
-- random key for it and stores only the key's SHA-256 here. Claude, working
-- outside the Builder, sends each step to supabase/functions/bridge with
-- the session and its key; the function checks the key and writes the step
-- to bridge_calls. The person's open Builder tab sees the step, runs it on
-- the canvas with the assistant's own tools, and writes the result back,
-- which the function hands to Claude. The file itself stays in the browser:
-- what travels is each step and what it answers (an outline, a picture, a
-- check), and both go when the session ends.
--
-- Run it after schema.sql, in the Supabase SQL editor; running it again is
-- safe. See docs/cloud.md.

-- ------------------------------------------------------------------ tables

create table if not exists public.bridge_sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  can_edit boolean not null default true,
  ask_first boolean not null default false,
  paused boolean not null default false,
  label text not null default '' check (char_length(label) <= 120),
  created_at timestamptz not null default now(),
  last_call timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.bridge_calls (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.bridge_sessions (id) on delete cascade,
  call jsonb not null,
  result jsonb,
  status text not null default 'waiting' check (status in ('waiting', 'done')),
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists bridge_calls_waiting on public.bridge_calls (session_id) where status = 'waiting';
create index if not exists bridge_sessions_owner on public.bridge_sessions (owner);

-- ---------------------------------------------------------------- policies

alter table public.bridge_sessions enable row level security;
alter table public.bridge_calls enable row level security;

-- Nothing here is for visitors who aren't signed in. Steps are only ever
-- added by the function, which holds the service role; no browser adds one.
revoke all on public.bridge_sessions, public.bridge_calls from anon;
revoke insert, delete on public.bridge_calls from authenticated;

drop policy if exists "bridge sessions: owner reads" on public.bridge_sessions;
create policy "bridge sessions: owner reads" on public.bridge_sessions for select to authenticated
  using (owner = auth.uid());
drop policy if exists "bridge sessions: owner starts" on public.bridge_sessions;
create policy "bridge sessions: owner starts" on public.bridge_sessions for insert to authenticated
  with check (owner = auth.uid());
drop policy if exists "bridge sessions: owner changes" on public.bridge_sessions;
create policy "bridge sessions: owner changes" on public.bridge_sessions for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "bridge sessions: owner removes" on public.bridge_sessions;
create policy "bridge sessions: owner removes" on public.bridge_sessions for delete to authenticated
  using (owner = auth.uid());

drop policy if exists "bridge calls: owner reads" on public.bridge_calls;
create policy "bridge calls: owner reads" on public.bridge_calls for select to authenticated
  using (exists (select 1 from public.bridge_sessions s where s.id = session_id and s.owner = auth.uid()));
drop policy if exists "bridge calls: owner answers" on public.bridge_calls;
create policy "bridge calls: owner answers" on public.bridge_calls for update to authenticated
  using (exists (select 1 from public.bridge_sessions s where s.id = session_id and s.owner = auth.uid()))
  with check (exists (select 1 from public.bridge_sessions s where s.id = session_id and s.owner = auth.uid()));

-- A session keeps its owner and its key; its owner only ends, pauses or
-- changes what it may do.
create or replace function public.bridge_session_fixed() returns trigger
language plpgsql as $$
begin
  new.owner := old.owner;
  new.key_hash := old.key_hash;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists bridge_sessions_fixed on public.bridge_sessions;
create trigger bridge_sessions_fixed before update on public.bridge_sessions
  for each row execute function public.bridge_session_fixed();

-- An answer only fills in a waiting step: the step itself stays as sent.
create or replace function public.bridge_call_answered() returns trigger
language plpgsql as $$
begin
  if old.status = 'done' then
    raise exception 'that step was already answered' using errcode = 'check_violation';
  end if;
  new.session_id := old.session_id;
  new.call := old.call;
  new.created_at := old.created_at;
  new.status := 'done';
  new.done_at := now();
  return new;
end;
$$;

drop trigger if exists bridge_calls_answered on public.bridge_calls;
create trigger bridge_calls_answered before update on public.bridge_calls
  for each row execute function public.bridge_call_answered();

-- Ended sessions' steps go: nothing a session carried outlives it by more
-- than a day. The function calls this now and then; so can a schedule.
create or replace function public.bridge_tidy() returns integer
language plpgsql security definer set search_path = public as $$
declare
  gone integer;
begin
  delete from public.bridge_sessions
  where ended_at < now() - interval '1 day'
     or last_call < now() - interval '1 day';
  get diagnostics gone = row_count;
  return gone;
end;
$$;

revoke all on function public.bridge_tidy() from public, anon, authenticated;

-- The Builder hears new steps through Realtime when the project has it.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bridge_calls') then
    alter publication supabase_realtime add table public.bridge_calls;
  end if;
end $$;
