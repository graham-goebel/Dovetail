-- Who can read and change the assistant's context, tried as each kind of
-- person. A clean run prints "assistant: all checks passed".
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users values
  ('a0000000-0000-0000-0000-00000000000a', 'amy@example.com', now()),
  ('b0000000-0000-0000-0000-00000000000b', 'bo@example.com', now()),
  ('c0000000-0000-0000-0000-00000000000c', 'cy@example.com', now()),
  ('d0000000-0000-0000-0000-00000000000d', 'di@example.com', now())
on conflict (id) do nothing;

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'assistant check failed: %', what; end if;
end $$;
create function pg_temp.refused(stmt text, what text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege or check_violation then return;
  end;
  raise exception 'assistant check failed: %', what;
end $$;

-- Amy makes a team, adds Bo as an editor and Cy as a viewer. Di is outside.
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
insert into public.teams (id, name) values ('70000000-0000-0000-0000-000000000001', 'Studio');
select pg_temp.expect(public.team_role('70000000-0000-0000-0000-000000000001') = 'owner', 'a team''s maker is its owner');
insert into public.team_members (team_id, user_id, role) values
  ('70000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b', 'editor'),
  ('70000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c', 'viewer');
select pg_temp.refused($$insert into public.team_members (team_id, user_id, role) values ('70000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-00000000000d', 'owner')$$, 'nobody is added as a second owner');

-- A project group in the team, a file of Amy's own, and one doc for each scope.
insert into public.file_groups (id, name, team_id) values ('60000000-0000-0000-0000-000000000001', 'Launch', '70000000-0000-0000-0000-000000000001');
insert into public.projects (id, name, group_id) values ('50000000-0000-0000-0000-000000000001', 'Home page', '60000000-0000-0000-0000-000000000001');
insert into public.context_docs (team_id, title, body) values ('70000000-0000-0000-0000-000000000001', 'Brand voice', 'Plain words.');
insert into public.context_docs (group_id, title) values ('60000000-0000-0000-0000-000000000001', 'Launch brief');
insert into public.context_docs (file_id, title, pages) values ('50000000-0000-0000-0000-000000000001', 'Home goals', '{main}');
select pg_temp.refused($$insert into public.context_docs (team_id, file_id, title) values ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Two scopes')$$, 'a doc belongs to exactly one scope');
insert into public.skills (id, team_id, name, description) values ('40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'brand-review', 'Use when a change touches copy, colour or type.');
insert into public.skill_files (skill_id, path, body) values
  ('40000000-0000-0000-0000-000000000001', 'SKILL.md', '# Brand review'),
  ('40000000-0000-0000-0000-000000000001', 'refs/voice.md', 'Examples');
select pg_temp.refused($$insert into public.skill_files (skill_id, path) values ('40000000-0000-0000-0000-000000000001', '../escape.md')$$, 'a skill file can''t climb out of its skill');
select pg_temp.refused($$insert into public.skills (team_id, name) values ('70000000-0000-0000-0000-000000000001', 'Not A Name')$$, 'a skill name is lowercase words and dashes');

-- Bo, an editor, reads the team's and the group's docs, and can change them.
select pg_temp.as_user('b0000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) from public.context_docs) = 2, 'a team editor reads the team and group docs, not a file they aren''t on');
update public.context_docs set body = 'Plain, warm words.' where title = 'Brand voice';
select pg_temp.expect((select body from public.context_docs where title = 'Brand voice') = 'Plain, warm words.', 'a team editor changes a team doc');
select pg_temp.expect((select count(*) from public.skill_files) = 2, 'a team editor reads the team skill''s files');

-- Cy, a viewer, reads them but can't change or add.
select pg_temp.as_user('c0000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) from public.context_docs) = 2, 'a team viewer reads the team and group docs');
update public.context_docs set body = 'Shouting.' where title = 'Brand voice';
select pg_temp.expect((select body from public.context_docs where title = 'Brand voice') = 'Plain, warm words.', 'a viewer''s update changes nothing');
select pg_temp.refused($$insert into public.context_docs (team_id, title) values ('70000000-0000-0000-0000-000000000001', 'Viewer note')$$, 'a viewer can''t add a team doc');
select pg_temp.refused($$insert into public.skill_files (skill_id, path) values ('40000000-0000-0000-0000-000000000001', 'more.md')$$, 'a viewer can''t add to a skill');

-- Di, outside the team, sees none of it and can't write into it.
select pg_temp.as_user('d0000000-0000-0000-0000-00000000000d');
select pg_temp.expect((select count(*) from public.context_docs) = 0, 'someone outside reads no docs');
select pg_temp.expect((select count(*) from public.skills) = 0 and (select count(*) from public.skill_files) = 0, 'someone outside reads no skills');
select pg_temp.expect((select count(*) from public.teams) = 0 and (select count(*) from public.file_groups) = 0, 'someone outside sees no team or group');
select pg_temp.refused($$insert into public.context_docs (team_id, title) values ('70000000-0000-0000-0000-000000000001', 'Intruder')$$, 'someone outside can''t add a team doc');
select pg_temp.refused($$insert into public.context_docs (file_id, title) values ('50000000-0000-0000-0000-000000000001', 'Intruder')$$, 'someone outside can''t add a file doc');
select pg_temp.refused($$insert into public.file_groups (name, team_id) values ('Mine now', '70000000-0000-0000-0000-000000000001')$$, 'someone outside can''t make a group in the team');
-- Di's own doc on Di's own file, which is theirs alone.
insert into public.projects (id, name) values ('50000000-0000-0000-0000-000000000002', 'Di''s file');
insert into public.context_docs (file_id, title) values ('50000000-0000-0000-0000-000000000002', 'Di''s notes');
select pg_temp.expect((select count(*) from public.context_docs) = 1, 'a file member reads its own file''s doc');

-- The run log is written server side only; each person reads their own.
reset role;
insert into public.assistant_runs (user_id, model, status) values ('d0000000-0000-0000-0000-00000000000d', 'claude-opus-5-5', 'done'), ('a0000000-0000-0000-0000-00000000000a', 'claude-opus-5-5', 'done');
select pg_temp.as_user('d0000000-0000-0000-0000-00000000000d');
select pg_temp.expect((select count(*) from public.assistant_runs) = 1, 'a person reads only their own runs');
select pg_temp.refused($$insert into public.assistant_runs (user_id) values ('d0000000-0000-0000-0000-00000000000d')$$, 'a browser can''t write the run log');

-- Bo leaves the team and loses its docs; deleting the team takes its docs and skills.
select pg_temp.as_user('b0000000-0000-0000-0000-00000000000b');
delete from public.team_members where team_id = '70000000-0000-0000-0000-000000000001' and user_id = auth.uid();
select pg_temp.expect((select count(*) from public.context_docs) = 0, 'leaving a team leaves its docs behind');
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
delete from public.teams where id = '70000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.expect((select count(*) from public.skills where team_id is not null) = 0 and (select count(*) from public.skill_files) = 0 and (select count(*) from public.context_docs where team_id is not null) = 0, 'deleting a team takes its docs, skills and skill files');
select pg_temp.expect((select team_id from public.file_groups where id = '60000000-0000-0000-0000-000000000001') is null, 'a group outlives its team');

-- Conversations: Amy's file with Bo on it; Di is outside.
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
insert into public.projects (id, name) values ('50000000-0000-0000-0000-000000000009', 'Pricing');
insert into public.project_members (project_id, user_id) values ('50000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b');
insert into public.assistant_threads (id, file_id, title, body) values ('30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000009', 'Pricing page', '{"thread": []}');
select pg_temp.refused($$insert into public.assistant_threads (file_id, created_by) values ('50000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b')$$, 'nobody starts a conversation in someone else''s name');
select pg_temp.as_user('b0000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) from public.assistant_threads) = 0, 'a conversation is its starter''s until it''s shared');
insert into public.assistant_threads (id, file_id, title) values ('30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000009', 'Bo''s own');
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) from public.assistant_threads) = 1, 'someone else''s unshared conversation stays theirs');
update public.assistant_threads set shared = true where id = '30000000-0000-0000-0000-000000000001';
select pg_temp.as_user('b0000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) from public.assistant_threads) = 2, 'a shared conversation shows to everyone on the file');
update public.assistant_threads set body = '{"thread": [{"by": "bo"}]}' where id = '30000000-0000-0000-0000-000000000001' and rev = 1;
select pg_temp.expect((select rev from public.assistant_threads where id = '30000000-0000-0000-0000-000000000001') = 2 and (select updated_by from public.assistant_threads where id = '30000000-0000-0000-0000-000000000001') = 'b0000000-0000-0000-0000-00000000000b', 'anyone on the file carries on a shared conversation, and the save says who');
update public.assistant_threads set body = '{"stale": true}' where id = '30000000-0000-0000-0000-000000000001' and rev = 1;
select pg_temp.expect((select body from public.assistant_threads where id = '30000000-0000-0000-0000-000000000001') ? 'thread', 'a save from an older copy changes nothing');
select pg_temp.refused($$update public.assistant_threads set shared = false where id = '30000000-0000-0000-0000-000000000001'$$, 'only the starter unshares a conversation');
update public.assistant_threads set created_by = auth.uid() where id = '30000000-0000-0000-0000-000000000001';
select pg_temp.expect((select created_by from public.assistant_threads where id = '30000000-0000-0000-0000-000000000001') = 'a0000000-0000-0000-0000-00000000000a', 'a conversation keeps its starter');
delete from public.assistant_threads where id = '30000000-0000-0000-0000-000000000001';
select pg_temp.expect((select count(*) from public.assistant_threads where id = '30000000-0000-0000-0000-000000000001') = 1, 'only the starter deletes a conversation');
select pg_temp.as_user('d0000000-0000-0000-0000-00000000000d');
select pg_temp.expect((select count(*) from public.assistant_threads) = 0, 'someone off the file sees none of its conversations');
select pg_temp.refused($$insert into public.assistant_threads (file_id) values ('50000000-0000-0000-0000-000000000009')$$, 'someone off the file can''t start one there');
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
delete from public.project_members where project_id = '50000000-0000-0000-0000-000000000009' and user_id = 'b0000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('b0000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) from public.assistant_threads) = 0, 'leaving a file leaves its conversations behind, your own included');
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
delete from public.projects where id = '50000000-0000-0000-0000-000000000009';
reset role;
select pg_temp.expect((select count(*) from public.assistant_threads) = 0, 'deleting a file takes its conversations');

select 'assistant: all checks passed' as result;
