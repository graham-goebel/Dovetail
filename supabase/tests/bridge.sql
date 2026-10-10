-- Who can see and answer a bridge session, tried as each kind of person. A
-- clean run prints "bridge: all checks passed".
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users values
  ('a0000000-0000-0000-0000-00000000000a', 'amy@example.com', now()),
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
  if not coalesce(ok, false) then raise exception 'bridge check failed: %', what; end if;
end $$;
create function pg_temp.refused(stmt text, what text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege or check_violation then return;
  end;
  raise exception 'bridge check failed: %', what;
end $$;

-- Amy starts a session.
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
insert into public.bridge_sessions (id, key_hash, label) values ('b1000000-0000-0000-0000-000000000001', repeat('ab', 32), 'Ledger');
select pg_temp.expect((select owner from public.bridge_sessions) = 'a0000000-0000-0000-0000-00000000000a', 'a session is its starter''s');
select pg_temp.refused($$insert into public.bridge_sessions (key_hash, owner) values (repeat('cd', 32), 'd0000000-0000-0000-0000-00000000000d')$$, 'nobody starts a session for someone else');
select pg_temp.refused($$insert into public.bridge_sessions (key_hash) values ('not a hash')$$, 'a session stores a hash, never the key');
select pg_temp.refused($$insert into public.bridge_calls (session_id, call) values ('b1000000-0000-0000-0000-000000000001', '{"name":"read_page"}')$$, 'a browser can''t add a step, even to its own session');

-- The function adds a step (as the service role, which skips the policies).
reset role;
insert into public.bridge_calls (id, session_id, call) overriding system value values (1, 'b1000000-0000-0000-0000-000000000001', '{"name":"read_page","input":{}}');

-- Di, outside, sees nothing and answers nothing.
select pg_temp.as_user('d0000000-0000-0000-0000-00000000000d');
select pg_temp.expect((select count(*) from public.bridge_sessions) = 0, 'someone else''s session stays hidden');
select pg_temp.expect((select count(*) from public.bridge_calls) = 0, 'and so do its steps');
update public.bridge_calls set result = '{"ok":true,"result":"forged"}' where id = 1;
update public.bridge_sessions set ended_at = now() where id = 'b1000000-0000-0000-0000-000000000001';

-- Amy sees the step and answers it once; the step itself can't be changed.
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select status from public.bridge_calls where id = 1) = 'waiting', 'an outsider''s answer changed nothing');
select pg_temp.expect((select ended_at from public.bridge_sessions) is null, 'an outsider can''t end the session');
update public.bridge_calls set result = '{"ok":true,"result":"Ledger, 64 layers"}', call = '{"name":"remove"}' where id = 1;
select pg_temp.expect((select status from public.bridge_calls where id = 1) = 'done' and (select call->>'name' from public.bridge_calls where id = 1) = 'read_page' and (select done_at from public.bridge_calls where id = 1) is not null, 'the owner answers a step, which keeps what was asked');
select pg_temp.refused($$update public.bridge_calls set result = '{"ok":false}' where id = 1$$, 'a step is answered once');
update public.bridge_sessions set key_hash = repeat('ef', 32), owner = 'd0000000-0000-0000-0000-00000000000d', paused = true where id = 'b1000000-0000-0000-0000-000000000001';
select pg_temp.expect((select key_hash from public.bridge_sessions) = repeat('ab', 32) and (select owner from public.bridge_sessions) = 'a0000000-0000-0000-0000-00000000000a' and (select paused from public.bridge_sessions), 'a session keeps its owner and key; its owner pauses it');
update public.bridge_sessions set ended_at = now() - interval '2 days' where id = 'b1000000-0000-0000-0000-000000000001';
select pg_temp.refused($$select public.bridge_tidy()$$, 'only the function tidies');
reset role;
select pg_temp.expect(public.bridge_tidy() = 1, 'an ended session goes after a day');
select pg_temp.expect((select count(*) from public.bridge_calls) = 0, 'and its steps with it');

select 'bridge: all checks passed' as result;
