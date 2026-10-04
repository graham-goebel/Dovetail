-- Stand-ins for what a Supabase project already has, so schema.sql and its
-- policies can be tried on a plain Postgres (16 or later). Not for Supabase:
-- run supabase/schema.sql there on its own. See supabase/tests/run.sh.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
create schema realtime;
create table realtime.messages (id bigserial primary key, topic text not null, payload jsonb);
create function realtime.topic() returns text language sql stable as $$
  select nullif(current_setting('realtime.topic', true), '')
$$;
alter table realtime.messages enable row level security;
grant usage on schema realtime to authenticated;
grant select, insert on realtime.messages to authenticated;
grant usage, select on sequence realtime.messages_id_seq to authenticated;
grant execute on function realtime.topic() to authenticated;
-- Supabase's defaults: the API roles use public and get its tables and functions.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
