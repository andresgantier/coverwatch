-- Phase 2a: helper functions and the triggers that enforce business rules
-- (contract lifecycle, coverage snapshot on tickets, preventive plan generation,
-- what each role may change).

-- ---------------------------------------------------------------------------
-- Private schema: helpers that are not exposed through the API
-- ---------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated;

-- Role of the signed-in user (null if not signed in or deactivated).
-- SECURITY DEFINER so it can read profiles without triggering RLS recursion.
create function private.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active;
$$;

create function private.has_role(variadic p_roles public.user_role[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(private.app_role() = any (p_roles), false);
$$;

-- True when the statement comes from the app (API roles), false for admin
-- connections such as migrations, the demo seed script or scheduled jobs.
create function private.is_app_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('authenticated', 'anon');
$$;

-- "Today" in the company's time zone.
create function private.today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Berlin')::date;
$$;

grant execute on function private.app_role(), private.has_role(public.user_role[]),
  private.is_app_user(), private.today() to authenticated;

-- ---------------------------------------------------------------------------
-- New auth users get a profile (role viewer; a manager promotes them)
-- ---------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Coverage periods: every non-draft contract is a binding period (ACTIVE,
-- RENEWED and EXPIRED covered their dates; TERMINATED only until terminated_on).
-- ---------------------------------------------------------------------------
alter table public.contract_equipment rename column is_active_contract to is_binding;
comment on column public.contract_equipment.is_binding is
  'True when the contract is not a draft. Binding periods of the same unit may not overlap.';

alter table public.contracts
  add constraint contracts_terminated_on_chk
  check (terminated_on is null or terminated_on between start_date and end_date);

create or replace function public.contract_equipment_copy_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select daterange(c.start_date, coalesce(c.terminated_on, c.end_date), '[]'), c.status <> 'DRAFT'
    into new.coverage, new.is_binding
  from public.contracts c
  where c.id = new.contract_id;
  return new;
end;
$$;

create or replace function public.contracts_sync_equipment_coverage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contract_equipment
     set coverage = daterange(new.start_date, coalesce(new.terminated_on, new.end_date), '[]'),
         is_binding = (new.status <> 'DRAFT')
   where contract_id = new.id;
  return null;
end;
$$;

drop trigger contracts_sync_equipment_coverage on public.contracts;
create trigger contracts_sync_equipment_coverage
after update of start_date, end_date, status, terminated_on on public.contracts
for each row execute function public.contracts_sync_equipment_coverage();

-- ---------------------------------------------------------------------------
-- Contract lifecycle guard
-- DRAFT -> ACTIVE -> EXPIRED | RENEWED | TERMINATED. Nothing is deleted.
-- Once active, the commercial terms are frozen; changes go through a renewal.
-- ---------------------------------------------------------------------------
create function private.contracts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_frozen text[] := array['contract_number', 'customer_id', 'contract_type', 'start_date', 'end_date',
                           'annual_value_eur', 'sla_p1_hours', 'sla_p2_hours', 'sla_p3_hours',
                           'preventive_visits_per_year', 'previous_contract_id', 'created_by', 'created_at'];
  v_editable_when_closed text[] := array['notes', 'pdf_path', 'updated_at'];
begin
  if not private.is_app_user() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Contracts cannot be deleted. Terminate them or let them expire.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'DRAFT' then
      raise exception 'New contracts start as DRAFT and are activated afterwards.' using errcode = 'P0001';
    end if;
    new.activated_at := null;
    new.created_by := auth.uid();
    return new;
  end if;

  -- UPDATE
  if old.status in ('EXPIRED', 'RENEWED', 'TERMINATED') then
    if (to_jsonb(new) - v_editable_when_closed) <> (to_jsonb(old) - v_editable_when_closed) then
      raise exception 'Contract % is % and can no longer be changed (only notes and PDF).',
        old.contract_number, old.status using errcode = 'P0001';
    end if;
    return new;
  end if;

  if old.status = 'ACTIVE'
     and exists (select 1 from unnest(v_frozen) k where to_jsonb(new) -> k is distinct from to_jsonb(old) -> k) then
    raise exception 'The terms of an active contract cannot be changed. Renew it as a new version instead.'
      using errcode = 'P0001';
  end if;

  if new.status is distinct from old.status then
    if not ((old.status = 'DRAFT' and new.status = 'ACTIVE')
         or (old.status = 'ACTIVE' and new.status in ('EXPIRED', 'RENEWED', 'TERMINATED'))) then
      raise exception 'Invalid status change for contract %: % -> %.', old.contract_number, old.status, new.status
        using errcode = 'P0001';
    end if;

    if new.status = 'ACTIVE' then
      if not exists (select 1 from public.contract_equipment ce where ce.contract_id = new.id) then
        raise exception 'Contract % has no equipment. Add at least one unit before activating it.',
          new.contract_number using errcode = 'P0001';
      end if;
      new.activated_at := now();
    elsif new.status = 'RENEWED' then
      if not exists (select 1 from public.contracts c where c.previous_contract_id = new.id) then
        raise exception 'Contract % can only be marked RENEWED by the renewal action.',
          new.contract_number using errcode = 'P0001';
      end if;
    elsif new.status = 'EXPIRED' then
      if new.end_date >= private.today() then
        raise exception 'Contract % cannot expire before its end date (%).', new.contract_number, new.end_date
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger contracts_10_guard
before insert or update or delete on public.contracts
for each row execute function private.contracts_guard();

-- Covered units can only be added/removed while the contract is a draft.
create function private.contract_equipment_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.contract_status;
begin
  if not private.is_app_user() then
    return coalesce(new, old);
  end if;

  select c.status into v_status
  from public.contracts c
  where c.id = coalesce(new.contract_id, old.contract_id);

  if v_status <> 'DRAFT' then
    raise exception 'Covered equipment can only be changed while the contract is a DRAFT. Use a renewal instead.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger contract_equipment_10_guard
before insert or delete on public.contract_equipment
for each row execute function private.contract_equipment_guard();

-- ---------------------------------------------------------------------------
-- Preventive plan: generated on activation, cancelled after a termination
-- ---------------------------------------------------------------------------
create function private.contracts_plan_visits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days integer;
  v_total integer;
begin
  if old.status = 'DRAFT' and new.status = 'ACTIVE' and new.preventive_visits_per_year > 0 then
    v_days := new.end_date - new.start_date + 1;
    -- Pro-rated for contracts shorter or longer than a year, at least one visit.
    v_total := greatest(1, round(new.preventive_visits_per_year * v_days / 365.0)::integer);

    -- Each visit is due in the middle of its slot (e.g. 2 per year: ~April and ~October).
    insert into public.preventive_visits (contract_id, visit_number, due_date)
    select new.id, i, new.start_date + floor(v_days * (2 * i - 1) / (2.0 * v_total))::integer
    from generate_series(1, v_total) as i
    on conflict (contract_id, visit_number) do nothing;
  end if;

  if old.status = 'ACTIVE' and new.status = 'TERMINATED' then
    update public.preventive_visits
       set status = 'CANCELLED',
           observations = concat_ws(' ', observations, '[Cancelled: contract terminated]')
     where contract_id = new.id
       and status = 'PLANNED'
       and coalesce(scheduled_date, due_date) > new.terminated_on;
  end if;

  return null;
end;
$$;

create trigger contracts_plan_visits
after update of status on public.contracts
for each row execute function private.contracts_plan_visits();

-- ---------------------------------------------------------------------------
-- Service requests: the database decides coverage and SLA when a ticket is
-- created (or when its unit, report time or priority change).
-- ---------------------------------------------------------------------------
create function private.service_requests_set_coverage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select ce.contract_id,
         case new.priority when 'P1' then c.sla_p1_hours when 'P2' then c.sla_p2_hours else c.sla_p3_hours end
    into new.covering_contract_id, new.sla_hours
  from public.contract_equipment ce
  join public.contracts c on c.id = ce.contract_id
  where ce.equipment_id = new.equipment_id
    and ce.is_binding
    and ce.coverage @> (new.reported_at at time zone 'Europe/Berlin')::date
  limit 1;
  -- No row found: both stay null = unit not covered, ticket is billable.
  return new;
end;
$$;

create trigger service_requests_20_coverage
before insert or update of equipment_id, reported_at, priority on public.service_requests
for each row execute function private.service_requests_set_coverage();

-- What each role may change on a ticket.
create function private.service_requests_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tech_fields text[] := array['status', 'first_response_at', 'resolved_at', 'resolution_notes',
                                'failure_start', 'failure_end', 'updated_at'];
begin
  if not private.is_app_user() then
    return new;
  end if;

  if new.first_response_at > now() + interval '5 minutes'
     or new.resolved_at > now() + interval '5 minutes'
     or new.failure_end > now() + interval '5 minutes' then
    raise exception 'Response, resolution and failure end times cannot be in the future.' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    return new;
  end if;

  if private.app_role() = 'technician' then
    if (to_jsonb(new) - v_tech_fields) <> (to_jsonb(old) - v_tech_fields) then
      raise exception 'Technicians can only record response, resolution and failure times on their tickets.'
        using errcode = '42501';
    end if;
    if new.status = 'CANCELLED' then
      raise exception 'Technicians cannot cancel tickets.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger service_requests_10_guard
before insert or update on public.service_requests
for each row execute function private.service_requests_guard();

-- What each role may change on a preventive visit.
create function private.preventive_visits_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tech_fields text[] := array['status', 'actual_date', 'result', 'observations', 'updated_at'];
begin
  if not private.is_app_user() then
    return new;
  end if;

  if new.contract_id <> old.contract_id or new.visit_number <> old.visit_number or new.due_date <> old.due_date then
    raise exception 'The preventive plan (contract, visit number, due date) cannot be changed.' using errcode = 'P0001';
  end if;

  if new.actual_date > private.today() then
    raise exception 'The actual visit date cannot be in the future.' using errcode = 'P0001';
  end if;

  if private.app_role() = 'technician' then
    if (to_jsonb(new) - v_tech_fields) <> (to_jsonb(old) - v_tech_fields) then
      raise exception 'Technicians can only record the outcome of their visits (date, result, observations).'
        using errcode = '42501';
    end if;
    if new.status = 'CANCELLED' then
      raise exception 'Technicians cannot cancel visits.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger preventive_visits_10_guard
before update on public.preventive_visits
for each row execute function private.preventive_visits_guard();

-- Trigger functions are never called directly.
revoke execute on all functions in schema private from public;
grant execute on function private.app_role(), private.has_role(public.user_role[]),
  private.is_app_user(), private.today() to authenticated;
revoke execute on function public.contract_equipment_copy_contract() from public, anon, authenticated;
revoke execute on function public.contracts_sync_equipment_coverage() from public, anon, authenticated;
