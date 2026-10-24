-- One policy per table and action (staff OR own technician work) instead of two
-- separate policies: same permissions, evaluated once per row (faster).

-- contracts
drop policy contracts_select_staff on public.contracts;
drop policy contracts_select_technician on public.contracts;
create policy contracts_select on public.contracts
  for select to authenticated
  using (
    (select private.has_role('manager', 'coordinator', 'viewer'))
    or (
      (select private.has_role('technician'))
      and (
        exists (select 1 from public.preventive_visits v
                where v.contract_id = contracts.id and v.assigned_technician_id = (select auth.uid()))
        or exists (select 1 from public.service_requests sr
                   where sr.covering_contract_id = contracts.id and sr.assigned_technician_id = (select auth.uid()))
      )
    )
  );

-- contract_equipment
drop policy contract_equipment_select_staff on public.contract_equipment;
drop policy contract_equipment_select_technician on public.contract_equipment;
create policy contract_equipment_select on public.contract_equipment
  for select to authenticated
  using (
    (select private.has_role('manager', 'coordinator', 'viewer'))
    or (
      (select private.has_role('technician'))
      and exists (select 1 from public.preventive_visits v
                  where v.contract_id = contract_equipment.contract_id
                    and v.assigned_technician_id = (select auth.uid()))
    )
  );

-- service_requests
drop policy service_requests_select_staff on public.service_requests;
drop policy service_requests_select_technician on public.service_requests;
create policy service_requests_select on public.service_requests
  for select to authenticated
  using (
    (select private.has_role('manager', 'coordinator', 'viewer'))
    or ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()))
  );

drop policy service_requests_update_staff on public.service_requests;
drop policy service_requests_update_technician on public.service_requests;
create policy service_requests_update on public.service_requests
  for update to authenticated
  using (
    (select private.has_role('manager', 'coordinator'))
    or ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()))
  )
  with check (
    (select private.has_role('manager', 'coordinator'))
    or ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()))
  );

-- preventive_visits
drop policy preventive_visits_select_staff on public.preventive_visits;
drop policy preventive_visits_select_technician on public.preventive_visits;
create policy preventive_visits_select on public.preventive_visits
  for select to authenticated
  using (
    (select private.has_role('manager', 'coordinator', 'viewer'))
    or ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()))
  );

drop policy preventive_visits_update_staff on public.preventive_visits;
drop policy preventive_visits_update_technician on public.preventive_visits;
create policy preventive_visits_update on public.preventive_visits
  for update to authenticated
  using (
    (select private.has_role('manager', 'coordinator'))
    or ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()))
  )
  with check (
    (select private.has_role('manager', 'coordinator'))
    or ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()))
  );
