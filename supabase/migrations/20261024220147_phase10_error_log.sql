-- Phase 10: readable error log. The app records server and browser errors here;
-- managers read them on the Continuity page. Nobody edits or deletes them via the app.

create table public.app_error_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  source      text not null check (source in ('server', 'client')),
  path        text,
  message     text not null,
  digest      text,
  user_id     uuid,
  details     jsonb
);
comment on table public.app_error_log is 'Errors reported by the app (server and browser), for troubleshooting.';
create index app_error_log_occurred_at_idx on public.app_error_log (occurred_at desc);

alter table public.app_error_log enable row level security;
revoke all on public.app_error_log from anon, authenticated;
grant select on public.app_error_log to authenticated;

create policy app_error_log_select on public.app_error_log
  for select to authenticated
  using ((select private.has_role('manager')));

-- The only way to write: a narrow function that trims the input and stamps the user.
create function public.log_app_error(
  p_source text, p_path text, p_message text, p_digest text default null, p_details jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.app_error_log (source, path, message, digest, user_id, details)
  select case when p_source = 'client' then 'client' else 'server' end,
         left(p_path, 500), left(coalesce(nullif(btrim(p_message), ''), 'Unknown error'), 2000),
         left(p_digest, 100), auth.uid(), p_details
  -- simple flood guard: at most 30 entries per minute
  where (select count(*) from public.app_error_log where occurred_at > now() - interval '1 minute') < 30;
$$;

revoke execute on function public.log_app_error(text, text, text, text, jsonb) from public, anon;
grant execute on function public.log_app_error(text, text, text, text, jsonb) to authenticated;
