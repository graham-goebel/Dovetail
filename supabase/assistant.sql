-- Dovetail Builder: the assistant's cloud.
--
-- Teams of people, project groups (the "projects" Home shows, each holding
-- files), and what the assistant reads: context docs and skills, each kept
-- for one team, one project group or one file. Run it after schema.sql, in
-- the Supabase SQL editor; running it again is safe.
--
-- A file is a row of public.projects (schema.sql named it before groups
-- existed). The assistant itself runs in supabase/functions/assistant, which
-- holds the model key as a secret; nothing here, and nothing a browser can
-- reach, ever sees that key. See docs/cloud.md.

-- ------------------------------------------------------------------ tables

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Team' check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  email citext,
  added_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- A project group: what Home calls a project, holding files. Its own maker
-- sees it; with a team, so does the team.
create table if not exists public.file_groups (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  name text not null default 'Project' check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists group_id uuid references public.file_groups (id) on delete set null;

-- A context doc: markdown the assistant reads. Kept for exactly one of a
-- team, a project group or a file; pages (page ids in a file) narrows a
-- file's doc to some of its pages.
create table if not exists public.context_docs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams (id) on delete cascade,
  group_id uuid references public.file_groups (id) on delete cascade,
  file_id uuid references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (octet_length(body) < 400000),
  source text not null default 'written' check (source in ('written', 'uploaded', 'generated')),
  use text not null default 'always' check (use in ('always', 'attach', 'off')),
  pages text[] not null default '{}' check (cardinality(pages) <= 200),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint context_docs_one_scope check (num_nonnulls(team_id, group_id, file_id) = 1)
);

-- A skill: a SKILL.md and the files beside it. The assistant reads its
-- description always and the rest only when a request fits it.
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams (id) on delete cascade,
  group_id uuid references public.file_groups (id) on delete cascade,
  file_id uuid references public.projects (id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  description text not null default '' check (char_length(description) <= 1024),
  enabled boolean not null default true,
  source text not null default 'uploaded' check (source in ('uploaded', 'written')),
  pages text[] not null default '{}' check (cardinality(pages) <= 200),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_one_scope check (num_nonnulls(team_id, group_id, file_id) = 1)
);

create table if not exists public.skill_files (
  skill_id uuid not null references public.skills (id) on delete cascade,
  path text not null check (path ~ '^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$' and path !~ '(^|/)\.\.?(/|$)' and char_length(path) <= 200),
  body text not null default '' check (octet_length(body) < 400000),
  updated_at timestamptz not null default now(),
  primary key (skill_id, path)
);

-- One line per assistant request: written by the assistant function (with
-- the service key, server side), read by the person who made it. It counts
-- requests for the hourly limit and records tokens used.
create table if not exists public.assistant_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid references public.projects (id) on delete set null,
  model text not null default '',
  status text not null default 'started' check (status in ('started', 'done', 'refused', 'failed')),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists team_members_user on public.team_members (user_id);
create index if not exists context_docs_team on public.context_docs (team_id) where team_id is not null;
create index if not exists context_docs_group on public.context_docs (group_id) where group_id is not null;
create index if not exists context_docs_file on public.context_docs (file_id) where file_id is not null;
create index if not exists skills_team on public.skills (team_id) where team_id is not null;
create index if not exists skills_group on public.skills (group_id) where group_id is not null;
create index if not exists skills_file on public.skills (file_id) where file_id is not null;
create index if not exists assistant_runs_user_time on public.assistant_runs (user_id, created_at desc);

-- ------------------------------------------------------------- functions

create or replace function public.team_role(tid uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.team_members m where m.team_id = tid and m.user_id = auth.uid();
$$;

create or replace function public.is_team_member(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.team_role(tid) is not null;
$$;

create or replace function public.is_team_editor(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.team_role(tid) in ('owner', 'editor'), false);
$$;

create or replace function public.can_see_group(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.file_groups g
    where g.id = gid and (g.owner = auth.uid() or (g.team_id is not null and public.is_team_member(g.team_id)))
  );
$$;

create or replace function public.can_edit_group(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.file_groups g
    where g.id = gid and (g.owner = auth.uid() or (g.team_id is not null and public.is_team_editor(g.team_id)))
  );
$$;

-- Whether the signed-in user may read, or change, what's kept for a scope:
-- a team (its members read, its editors change), a project group (seen and
-- changed as the group is), or a file (its members).
create or replace function public.scope_ok(tid uuid, gid uuid, fid uuid, writing boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when tid is not null then (case when writing then public.is_team_editor(tid) else public.is_team_member(tid) end)
    when gid is not null then (case when writing then public.can_edit_group(gid) else public.can_see_group(gid) end)
    when fid is not null then public.is_member(fid)
    else false
  end;
$$;

create or replace function public.skill_ok(sid uuid, writing boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.skills s where s.id = sid and public.scope_ok(s.team_id, s.group_id, s.file_id, writing));
$$;

-- A team's maker becomes its owner member.
create or replace function public.add_team_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.team_members (team_id, user_id, role, email)
  values (new.id, new.owner, 'owner', (select u.email from auth.users u where u.id = new.owner))
  on conflict (team_id, user_id) do nothing;
  return new;
end;
$$;

-- An update keeps who made a row and when, and stamps the time.
create or replace function public.touch_owned() returns trigger
language plpgsql as $$
begin
  new.owner := old.owner;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_context() returns trigger
language plpgsql as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_skill_file() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.team_role(uuid) from public, anon;
revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.is_team_editor(uuid) from public, anon;
revoke all on function public.can_see_group(uuid) from public, anon;
revoke all on function public.can_edit_group(uuid) from public, anon;
revoke all on function public.scope_ok(uuid, uuid, uuid, boolean) from public, anon;
revoke all on function public.skill_ok(uuid, boolean) from public, anon;
grant execute on function public.team_role(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_editor(uuid) to authenticated;
grant execute on function public.can_see_group(uuid) to authenticated;
grant execute on function public.can_edit_group(uuid) to authenticated;
grant execute on function public.scope_ok(uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.skill_ok(uuid, boolean) to authenticated;

-- --------------------------------------------------------------- triggers

drop trigger if exists teams_add_owner on public.teams;
create trigger teams_add_owner after insert on public.teams
  for each row execute function public.add_team_owner();
drop trigger if exists teams_touch on public.teams;
create trigger teams_touch before update on public.teams
  for each row execute function public.touch_owned();
drop trigger if exists file_groups_touch on public.file_groups;
create trigger file_groups_touch before update on public.file_groups
  for each row execute function public.touch_owned();
drop trigger if exists context_docs_touch on public.context_docs;
create trigger context_docs_touch before update on public.context_docs
  for each row execute function public.touch_context();
drop trigger if exists skills_touch on public.skills;
create trigger skills_touch before update on public.skills
  for each row execute function public.touch_context();
drop trigger if exists skill_files_touch on public.skill_files;
create trigger skill_files_touch before update on public.skill_files
  for each row execute function public.touch_skill_file();

-- ---------------------------------------------------------------- policies

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.file_groups enable row level security;
alter table public.context_docs enable row level security;
alter table public.skills enable row level security;
alter table public.skill_files enable row level security;
alter table public.assistant_runs enable row level security;

revoke all on public.teams, public.team_members, public.file_groups, public.context_docs, public.skills, public.skill_files, public.assistant_runs from anon;
grant select, insert, update, delete on public.teams, public.team_members, public.file_groups, public.context_docs, public.skills, public.skill_files to authenticated;
grant select on public.assistant_runs to authenticated;

drop policy if exists "teams: members read" on public.teams;
create policy "teams: members read" on public.teams for select to authenticated
  using (public.is_team_member(id) or owner = auth.uid());
drop policy if exists "teams: make your own" on public.teams;
create policy "teams: make your own" on public.teams for insert to authenticated
  with check (owner = auth.uid());
drop policy if exists "teams: owner changes" on public.teams;
create policy "teams: owner changes" on public.teams for update to authenticated
  using (public.team_role(id) = 'owner');
drop policy if exists "teams: owner deletes" on public.teams;
create policy "teams: owner deletes" on public.teams for delete to authenticated
  using (public.team_role(id) = 'owner');

drop policy if exists "team members: members read" on public.team_members;
create policy "team members: members read" on public.team_members for select to authenticated
  using (public.is_team_member(team_id));
drop policy if exists "team members: owner adds" on public.team_members;
create policy "team members: owner adds" on public.team_members for insert to authenticated
  with check (public.team_role(team_id) = 'owner' and role <> 'owner');
drop policy if exists "team members: owner sets roles" on public.team_members;
create policy "team members: owner sets roles" on public.team_members for update to authenticated
  using (public.team_role(team_id) = 'owner' and user_id <> auth.uid())
  with check (role <> 'owner');
drop policy if exists "team members: owner removes, anyone leaves" on public.team_members;
create policy "team members: owner removes, anyone leaves" on public.team_members for delete to authenticated
  using ((public.team_role(team_id) = 'owner' and role <> 'owner') or (user_id = auth.uid() and role <> 'owner'));

drop policy if exists "groups: owner and team read" on public.file_groups;
create policy "groups: owner and team read" on public.file_groups for select to authenticated
  using (owner = auth.uid() or (team_id is not null and public.is_team_member(team_id)));
drop policy if exists "groups: make your own" on public.file_groups;
create policy "groups: make your own" on public.file_groups for insert to authenticated
  with check (owner = auth.uid() and (team_id is null or public.is_team_editor(team_id)));
drop policy if exists "groups: owner and team editors change" on public.file_groups;
create policy "groups: owner and team editors change" on public.file_groups for update to authenticated
  using (public.can_edit_group(id))
  with check (team_id is null or public.is_team_editor(team_id));
drop policy if exists "groups: owner deletes" on public.file_groups;
create policy "groups: owner deletes" on public.file_groups for delete to authenticated
  using (owner = auth.uid());

drop policy if exists "docs: scope reads" on public.context_docs;
create policy "docs: scope reads" on public.context_docs for select to authenticated
  using (public.scope_ok(team_id, group_id, file_id, false));
drop policy if exists "docs: scope editors add" on public.context_docs;
create policy "docs: scope editors add" on public.context_docs for insert to authenticated
  with check (public.scope_ok(team_id, group_id, file_id, true) and created_by = auth.uid());
drop policy if exists "docs: scope editors change" on public.context_docs;
create policy "docs: scope editors change" on public.context_docs for update to authenticated
  using (public.scope_ok(team_id, group_id, file_id, true))
  with check (public.scope_ok(team_id, group_id, file_id, true));
drop policy if exists "docs: scope editors remove" on public.context_docs;
create policy "docs: scope editors remove" on public.context_docs for delete to authenticated
  using (public.scope_ok(team_id, group_id, file_id, true));

drop policy if exists "skills: scope reads" on public.skills;
create policy "skills: scope reads" on public.skills for select to authenticated
  using (public.scope_ok(team_id, group_id, file_id, false));
drop policy if exists "skills: scope editors add" on public.skills;
create policy "skills: scope editors add" on public.skills for insert to authenticated
  with check (public.scope_ok(team_id, group_id, file_id, true) and created_by = auth.uid());
drop policy if exists "skills: scope editors change" on public.skills;
create policy "skills: scope editors change" on public.skills for update to authenticated
  using (public.scope_ok(team_id, group_id, file_id, true))
  with check (public.scope_ok(team_id, group_id, file_id, true));
drop policy if exists "skills: scope editors remove" on public.skills;
create policy "skills: scope editors remove" on public.skills for delete to authenticated
  using (public.scope_ok(team_id, group_id, file_id, true));

drop policy if exists "skill files: read with the skill" on public.skill_files;
create policy "skill files: read with the skill" on public.skill_files for select to authenticated
  using (public.skill_ok(skill_id, false));
drop policy if exists "skill files: change with the skill" on public.skill_files;
create policy "skill files: change with the skill" on public.skill_files for all to authenticated
  using (public.skill_ok(skill_id, true))
  with check (public.skill_ok(skill_id, true));

drop policy if exists "runs: read your own" on public.assistant_runs;
create policy "runs: read your own" on public.assistant_runs for select to authenticated
  using (user_id = auth.uid());
