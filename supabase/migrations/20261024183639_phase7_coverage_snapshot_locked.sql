-- Fix: the coverage snapshot of a ticket (covering_contract_id, sla_hours) could be
-- overwritten by a direct update, because the trigger only ran when the unit, report
-- time or priority changed. Now it runs on every insert and update: the snapshot is
-- recalculated when those inputs change and kept as it was otherwise.

create or replace function private.service_requests_set_coverage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.equipment_id = old.equipment_id
     and new.reported_at = old.reported_at
     and new.priority = old.priority then
    new.covering_contract_id := old.covering_contract_id;
    new.sla_hours := old.sla_hours;
    return new;
  end if;

  -- Values sent by the client are ignored: no row found leaves both null (billable).
  new.covering_contract_id := null;
  new.sla_hours := null;
  select ce.contract_id,
         case new.priority when 'P1' then c.sla_p1_hours when 'P2' then c.sla_p2_hours else c.sla_p3_hours end
    into new.covering_contract_id, new.sla_hours
  from public.contract_equipment ce
  join public.contracts c on c.id = ce.contract_id
  where ce.equipment_id = new.equipment_id
    and ce.is_binding
    and ce.coverage @> (new.reported_at at time zone 'Europe/Berlin')::date
  limit 1;
  return new;
end;
$$;

drop trigger service_requests_20_coverage on public.service_requests;
create trigger service_requests_20_coverage
before insert or update on public.service_requests
for each row execute function private.service_requests_set_coverage();
