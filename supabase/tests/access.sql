-- Who can do what, tried as each kind of person. Every check raises if the
-- rules let through something they shouldn't, or stop something they should
-- allow; a clean run prints "access: all checks passed".
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ann@example.com', now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'ben@example.com', now()),
  ('cccccccc-0000-0000-0000-000000000003', 'cat@example.com', null),
  ('dddddddd-0000-0000-0000-000000000004', 'dan@example.com', now());

create function pg_temp.as_user(uid text, mail text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'email', mail, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'access check failed: %', what; end if;
end $$;

-- Ann makes a project and becomes its owner.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001', 'ann@example.com');
insert into public.projects (id, name) values ('11111111-1111-1111-1111-111111111111', 'Kiln site');
select pg_temp.expect((select role from public.project_members where project_id = '11111111-1111-1111-1111-111111111111' and user_id = auth.uid()) = 'owner', 'the maker is the owner member');
insert into public.pages (project_id, page_id, doc) values ('11111111-1111-1111-1111-111111111111', 'main', '{"frames":[]}');
update public.pages set doc = '{"frames":[1]}' where page_id = 'main';
select pg_temp.expect((select version from public.pages where page_id = 'main') = 2, 'a save counts up the version');
update public.projects set owner = 'dddddddd-0000-0000-0000-000000000004', name = 'Kiln' where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect((select owner from public.projects where id = '11111111-1111-1111-1111-111111111111') = 'aaaaaaaa-0000-0000-0000-000000000001', 'an update cannot hand the project to someone else');
do $$ begin
  begin
    insert into public.projects (name, owner) values ('Not mine', 'bbbbbbbb-0000-0000-0000-000000000002');
    raise exception 'access check failed: made a project in someone else''s name';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.project_invites (project_id, email) values
  ('11111111-1111-1111-1111-111111111111', 'BEN@example.com'),
  ('11111111-1111-1111-1111-111111111111', 'cat@example.com');
reset role;

-- Ben sees nothing until he accepts; then he edits but can't delete.
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002', 'ben@example.com');
select pg_temp.expect((select count(*) from public.projects) = 0, 'an invitee sees no project before accepting');
select pg_temp.expect((select count(*) from public.project_invites) = 1, 'an invitee sees the invite to his own address');
select pg_temp.expect(public.accept_invites() = 1, 'accepting joins the project');
select pg_temp.expect((select count(*) from public.projects) = 1, 'a member sees the project');
update public.pages set doc = '{"frames":[2]}' where page_id = 'main';
select pg_temp.expect((select version from public.pages where page_id = 'main') = 3, 'a member saves a page');
delete from public.projects where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect((select count(*) from public.projects) = 1, 'an editor cannot delete the project');
do $$ begin
  begin
    insert into public.project_members (project_id, user_id) values ('11111111-1111-1111-1111-111111111111', 'dddddddd-0000-0000-0000-000000000004');
    raise exception 'access check failed: an editor added a member';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.expect(public.can_use_topic('project:11111111-1111-1111-1111-111111111111:main'), 'a member may join the live channel');
select pg_temp.expect(not public.can_use_topic('project:not-a-uuid:main'), 'a malformed topic is refused');
select set_config('realtime.topic', 'project:11111111-1111-1111-1111-111111111111:main', false);
insert into realtime.messages (topic, payload) values ('project:11111111-1111-1111-1111-111111111111:main', '{}');
reset role;

-- Cat's address isn't confirmed, so her invite waits.
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003', 'cat@example.com');
select pg_temp.expect(public.accept_invites() = 0, 'an unconfirmed address cannot accept');
select pg_temp.expect((select count(*) from public.pages) = 0, 'a non-member reads no pages');
reset role;

-- Dan was never invited: nothing, including the live channel.
select pg_temp.as_user('dddddddd-0000-0000-0000-000000000004', 'dan@example.com');
select pg_temp.expect((select count(*) from public.projects) = 0, 'a stranger sees no project');
select pg_temp.expect((select count(*) from public.project_members) = 0, 'a stranger sees no members');
update public.pages set doc = '{"frames":["dan"]}' where page_id = 'main';
reset role;
select pg_temp.expect((select doc from public.pages where page_id = 'main') = '{"frames":[2]}', 'a stranger cannot change a page');
select pg_temp.as_user('dddddddd-0000-0000-0000-000000000004', 'dan@example.com');
select pg_temp.expect(not public.can_use_topic('project:11111111-1111-1111-1111-111111111111:main'), 'a stranger may not join the live channel');
select set_config('realtime.topic', 'project:11111111-1111-1111-1111-111111111111:main', false);
do $$ begin
  begin
    insert into realtime.messages (topic, payload) values ('project:11111111-1111-1111-1111-111111111111:main', '{}');
    raise exception 'access check failed: a stranger sent on the live channel';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Someone who isn't signed in reaches nothing at all.
set role anon;
do $$ begin
  begin
    perform count(*) from public.projects;
    raise exception 'access check failed: anon read projects';
  exception when insufficient_privilege then null; end;
  begin
    perform public.accept_invites();
    raise exception 'access check failed: anon ran accept_invites';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Ben leaves; the owner can remove members; deleting the project takes it all.
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002', 'ben@example.com');
delete from public.project_members where user_id = auth.uid();
select pg_temp.expect((select count(*) from public.projects) = 0, 'a member can leave');
reset role;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001', 'ann@example.com');
delete from public.projects where id = '11111111-1111-1111-1111-111111111111';
reset role;
select pg_temp.expect((select count(*) from public.pages) = 0 and (select count(*) from public.project_invites) = 0, 'deleting a project takes its pages and invites');

select 'access: all checks passed' as result;
