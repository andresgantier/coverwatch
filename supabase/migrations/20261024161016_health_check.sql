-- Health check used by /api/health to prove a real round trip to the database.
create or replace function public.health_check()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'db_time', now(),
    'pg_version', current_setting('server_version')
  );
$$;

revoke execute on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;
