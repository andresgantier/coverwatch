-- The demo-account check reads auth.users, which app users cannot read.
-- A SECURITY DEFINER helper answers only "is this a demo login?" for one id.
create function private.is_demo_login(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((u.raw_app_meta_data ->> 'demo_login')::boolean, false)
  from auth.users u
  where u.id = p_user_id;
$$;

revoke execute on function private.is_demo_login(uuid) from public;
grant execute on function private.is_demo_login(uuid) to authenticated;

create or replace function private.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_app_user() then
    return new;
  end if;

  if new.id <> old.id or new.email <> old.email then
    raise exception 'The user id and email cannot be changed here.' using errcode = 'P0001';
  end if;

  if (new.role <> old.role or new.is_active <> old.is_active) then
    if new.id = auth.uid() then
      raise exception 'You cannot change your own role or deactivate yourself.'
        using errcode = 'P0001', constraint = 'profiles_self_change';
    end if;
    if private.is_demo_login(new.id) then
      raise exception 'Demo login accounts are protected and cannot be changed.'
        using errcode = 'P0001', constraint = 'profiles_demo_protected';
    end if;
  end if;
  return new;
end;
$$;
