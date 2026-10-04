-- Dovetail Builder: the cloud.
--
-- Accounts (email and password), projects kept in the cloud, the people
-- each one is shared with, invites by email, every page's document, and the
-- rules for live editing. Run it once in the Supabase SQL editor
-- (SQL Editor > New query > paste > Run). Running it again is safe: every
-- table, function, trigger and policy is made if missing or replaced.
--
-- Everything a browser can do goes through row-level security: the anon key
-- the Builder ships with can only reach a project its signed-in user is a
-- member of. See docs/cloud.md.

create extension if not exists citext;

-- ------------------------------------------------------------------ tables

-- A project in the cloud. Its pages live in public.pages; settings carries
-- what the Builder keeps beside them (the page list and folders, the canvas
-- colour, the theme).
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Untitled' check (char_length(name) between 1 and 80),
  settings jsonb not null default '{}'::jsonb check (octet_length(settings::text) < 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Who can open and edit a project. Its owner is added when it's made.
create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  email citext,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- An invite waits for someone by email; signing in with that address (once
-- it is confirmed) turns it into a membership.
create table if not exists public.project_invites (
  project_id uuid not null references public.projects (id) on delete cascade,
  email citext not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, email)
);

-- One page's document: the frames and everything on them, as the Builder
-- saves it. version counts saves, so a stale write can be told apart.
create table if not exists public.pages (
  project_id uuid not null references public.projects (id) on delete cascade,
  page_id text not null check (page_id ~ '^[A-Za-z0-9_-]{1,40}$'),
  doc jsonb not null check (octet_length(doc::text) < 5000000),
  version bigint not null default 1,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (project_id, page_id)
);

create index if not exists project_members_user on public.project_members (user_id);
create index if not exists project_invites_email on public.project_invites (email);

-- ------------------------------------------------------------- functions

-- Whether the signed-in user is on a project. Security definer, so the
-- policies below can ask without recursing into their own table.
create or replace function public.is_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = pid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_owner(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = pid and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- A project's maker becomes its owner member.
create or replace function public.add_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role, email)
  values (new.id, new.owner, 'owner', (select u.email from auth.users u where u.id = new.owner))
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

-- An update keeps the owner and stamps the time.
create or replace function public.touch_project() returns trigger
language plpgsql as $$
begin
  new.owner := old.owner;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

-- A page save counts up its version and records who and when.
create or replace function public.touch_page() returns trigger
language plpgsql as $$
begin
  new.version := old.version + 1;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

-- Turns every invite addressed to the signed-in user into a membership.
-- Only a confirmed email counts, so nobody can claim an invite by signing up
-- with someone else's address. Returns how many projects were joined.
create or replace function public.accept_invites() returns integer
language plpgsql security definer set search_path = public as $$
declare
  me citext;
  joined integer;
begin
  select u.email into me from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
  if me is null then
    return 0;
  end if;
  insert into public.project_members (project_id, user_id, role, email)
  select i.project_id, auth.uid(), 'editor', me
  from public.project_invites i where i.email = me
  on conflict (project_id, user_id) do nothing;
  get diagnostics joined = row_count;
  delete from public.project_invites where email = me;
  return joined;
end;
$$;

-- Live editing runs on private Realtime channels named
-- project:<project id>:<page id>; only the project's members may use one.
create or replace function public.can_use_topic(topic text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  pid uuid;
begin
  if topic is null or topic !~ '^project:[0-9a-f-]{36}(:[A-Za-z0-9_-]{1,40})?$' then
    return false;
  end if;
  pid := split_part(topic, ':', 2)::uuid;
  return public.is_member(pid);
exception when others then
  return false;
end;
$$;

revoke all on function public.is_member(uuid) from public, anon;
revoke all on function public.is_owner(uuid) from public, anon;
revoke all on function public.accept_invites() from public, anon;
revoke all on function public.can_use_topic(text) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
grant execute on function public.accept_invites() to authenticated;
grant execute on function public.can_use_topic(text) to authenticated;

-- --------------------------------------------------------------- triggers

drop trigger if exists projects_add_owner on public.projects;
create trigger projects_add_owner after insert on public.projects
  for each row execute function public.add_owner();

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_project();

drop trigger if exists pages_touch on public.pages;
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_page();

-- ---------------------------------------------------------------- policies

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.pages enable row level security;

-- Nothing here is for visitors who aren't signed in.
revoke all on public.projects, public.project_members, public.project_invites, public.pages from anon;

-- Projects: members see and change them; anyone signed in makes their own;
-- only the owner deletes one.
drop policy if exists "projects: members read" on public.projects;
create policy "projects: members read" on public.projects for select to authenticated
  using (owner = auth.uid() or public.is_member(id));
drop policy if exists "projects: make your own" on public.projects;
create policy "projects: make your own" on public.projects for insert to authenticated
  with check (owner = auth.uid());
drop policy if exists "projects: members change" on public.projects;
create policy "projects: members change" on public.projects for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));
drop policy if exists "projects: owner deletes" on public.projects;
create policy "projects: owner deletes" on public.projects for delete to authenticated
  using (owner = auth.uid());

-- Members: a project's members see each other; its owner adds and removes
-- people; anyone may leave a project.
drop policy if exists "members: members read" on public.project_members;
create policy "members: members read" on public.project_members for select to authenticated
  using (public.is_member(project_id));
drop policy if exists "members: owner adds" on public.project_members;
create policy "members: owner adds" on public.project_members for insert to authenticated
  with check (public.is_owner(project_id));
drop policy if exists "members: owner removes, anyone leaves" on public.project_members;
create policy "members: owner removes, anyone leaves" on public.project_members for delete to authenticated
  using (public.is_owner(project_id) or user_id = auth.uid());

-- Invites: a project's members invite and withdraw; the person invited can
-- see invites to their own address.
drop policy if exists "invites: members and invitee read" on public.project_invites;
create policy "invites: members and invitee read" on public.project_invites for select to authenticated
  using (public.is_member(project_id) or email = (auth.jwt() ->> 'email')::citext);
drop policy if exists "invites: members invite" on public.project_invites;
create policy "invites: members invite" on public.project_invites for insert to authenticated
  with check (public.is_member(project_id) and invited_by = auth.uid());
drop policy if exists "invites: members withdraw" on public.project_invites;
create policy "invites: members withdraw" on public.project_invites for delete to authenticated
  using (public.is_member(project_id));

-- Pages: a project's members read and write every page of it.
drop policy if exists "pages: members read" on public.pages;
create policy "pages: members read" on public.pages for select to authenticated
  using (public.is_member(project_id));
drop policy if exists "pages: members add" on public.pages;
create policy "pages: members add" on public.pages for insert to authenticated
  with check (public.is_member(project_id));
drop policy if exists "pages: members save" on public.pages;
create policy "pages: members save" on public.pages for update to authenticated
  using (public.is_member(project_id)) with check (public.is_member(project_id));
drop policy if exists "pages: members remove" on public.pages;
create policy "pages: members remove" on public.pages for delete to authenticated
  using (public.is_member(project_id));

-- Realtime: members broadcast and receive on their project's channels, and
-- see who else is there.
drop policy if exists "realtime: members listen" on realtime.messages;
create policy "realtime: members listen" on realtime.messages for select to authenticated
  using (public.can_use_topic(realtime.topic()));
drop policy if exists "realtime: members send" on realtime.messages;
create policy "realtime: members send" on realtime.messages for insert to authenticated
  with check (public.can_use_topic(realtime.topic()));
