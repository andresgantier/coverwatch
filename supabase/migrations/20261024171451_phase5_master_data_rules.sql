-- Phase 5: rules for master data and user administration.

-- ---------------------------------------------------------------------------
-- A customer with an active contract cannot be deactivated.
-- ---------------------------------------------------------------------------
create function private.customers_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_app_user() then
    return new;
  end if;

  if old.is_active and not new.is_active
     and exists (select 1 from public.contracts c where c.customer_id = new.id and c.status = 'ACTIVE') then
    raise exception 'This customer has active contracts. Terminate them or let them expire before deactivating the customer.'
      using errcode = 'P0001', constraint = 'customers_active_contracts';
  end if;

  if new.customer_number <> old.customer_number then
    raise exception 'The customer number cannot be changed.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger customers_10_guard
before update on public.customers
for each row execute function private.customers_guard();

-- ---------------------------------------------------------------------------
-- User administration (managers): role and active flag only.
-- Nobody can change their own role or deactivate themselves (no lock-out),
-- and the shared demo login accounts are protected so the public demo keeps working.
-- ---------------------------------------------------------------------------
create function private.profiles_guard()
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
    if exists (select 1 from auth.users u
               where u.id = new.id and (u.raw_app_meta_data ->> 'demo_login')::boolean) then
      raise exception 'Demo login accounts are protected and cannot be changed.'
        using errcode = 'P0001', constraint = 'profiles_demo_protected';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_10_guard
before update on public.profiles
for each row execute function private.profiles_guard();

revoke execute on function private.customers_guard(), private.profiles_guard() from public;
