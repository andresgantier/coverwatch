-- Phase 2e: Row Level Security by role.
--   manager      everything (contracts, renewals, master data, users)
--   coordinator  customers, sites, equipment, service requests, visit planning; reads contracts
--   technician   only the visits and service requests assigned to them
--   viewer       read-only access to everything
-- Anonymous visitors get nothing. Nobody deletes through the app: records are
-- deactivated, cancelled, terminated or renewed instead.

-- ---------------------------------------------------------------------------
-- Table privileges (RLS decides the rows; these decide the operations)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

revoke delete, truncate on public.profiles, public.customers, public.sites, public.equipment,
  public.contracts, public.service_requests, public.preventive_visits from authenticated;
revoke truncate on public.contract_equipment from authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using ((select private.app_role()) is not null);

create policy profiles_update_manager on public.profiles
  for update to authenticated
  using ((select private.has_role('manager')))
  with check ((select private.has_role('manager')));

-- ---------------------------------------------------------------------------
-- customers, sites, equipment (master data)
-- ---------------------------------------------------------------------------
create policy customers_select on public.customers
  for select to authenticated using ((select private.app_role()) is not null);
create policy customers_insert on public.customers
  for insert to authenticated with check ((select private.has_role('manager', 'coordinator')));
create policy customers_update on public.customers
  for update to authenticated
  using ((select private.has_role('manager', 'coordinator')))
  with check ((select private.has_role('manager', 'coordinator')));

create policy sites_select on public.sites
  for select to authenticated using ((select private.app_role()) is not null);
create policy sites_insert on public.sites
  for insert to authenticated with check ((select private.has_role('manager', 'coordinator')));
create policy sites_update on public.sites
  for update to authenticated
  using ((select private.has_role('manager', 'coordinator')))
  with check ((select private.has_role('manager', 'coordinator')));

create policy equipment_select on public.equipment
  for select to authenticated using ((select private.app_role()) is not null);
create policy equipment_insert on public.equipment
  for insert to authenticated with check ((select private.has_role('manager', 'coordinator')));
create policy equipment_update on public.equipment
  for update to authenticated
  using ((select private.has_role('manager', 'coordinator')))
  with check ((select private.has_role('manager', 'coordinator')));

-- ---------------------------------------------------------------------------
-- contracts and covered equipment
-- Technicians only see the contracts behind their own visits and tickets.
-- ---------------------------------------------------------------------------
create policy contracts_select_staff on public.contracts
  for select to authenticated
  using ((select private.has_role('manager', 'coordinator', 'viewer')));

create policy contracts_select_technician on public.contracts
  for select to authenticated
  using (
    (select private.has_role('technician'))
    and (
      exists (select 1 from public.preventive_visits v
              where v.contract_id = contracts.id and v.assigned_technician_id = (select auth.uid()))
      or exists (select 1 from public.service_requests sr
                 where sr.covering_contract_id = contracts.id and sr.assigned_technician_id = (select auth.uid()))
    )
  );

create policy contracts_insert on public.contracts
  for insert to authenticated with check ((select private.has_role('manager')));
create policy contracts_update on public.contracts
  for update to authenticated
  using ((select private.has_role('manager')))
  with check ((select private.has_role('manager')));

create policy contract_equipment_select_staff on public.contract_equipment
  for select to authenticated
  using ((select private.has_role('manager', 'coordinator', 'viewer')));

create policy contract_equipment_select_technician on public.contract_equipment
  for select to authenticated
  using (
    (select private.has_role('technician'))
    and exists (select 1 from public.preventive_visits v
                where v.contract_id = contract_equipment.contract_id
                  and v.assigned_technician_id = (select auth.uid()))
  );

create policy contract_equipment_insert on public.contract_equipment
  for insert to authenticated with check ((select private.has_role('manager')));
create policy contract_equipment_delete on public.contract_equipment
  for delete to authenticated using ((select private.has_role('manager')));

-- ---------------------------------------------------------------------------
-- service_requests
-- ---------------------------------------------------------------------------
create policy service_requests_select_staff on public.service_requests
  for select to authenticated
  using ((select private.has_role('manager', 'coordinator', 'viewer')));

create policy service_requests_select_technician on public.service_requests
  for select to authenticated
  using ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()));

create policy service_requests_insert on public.service_requests
  for insert to authenticated with check ((select private.has_role('manager', 'coordinator')));

create policy service_requests_update_staff on public.service_requests
  for update to authenticated
  using ((select private.has_role('manager', 'coordinator')))
  with check ((select private.has_role('manager', 'coordinator')));

create policy service_requests_update_technician on public.service_requests
  for update to authenticated
  using ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()))
  with check ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- preventive_visits (created only by the plan generator, never by hand)
-- ---------------------------------------------------------------------------
create policy preventive_visits_select_staff on public.preventive_visits
  for select to authenticated
  using ((select private.has_role('manager', 'coordinator', 'viewer')));

create policy preventive_visits_select_technician on public.preventive_visits
  for select to authenticated
  using ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()));

create policy preventive_visits_update_staff on public.preventive_visits
  for update to authenticated
  using ((select private.has_role('manager', 'coordinator')))
  with check ((select private.has_role('manager', 'coordinator')));

create policy preventive_visits_update_technician on public.preventive_visits
  for update to authenticated
  using ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()))
  with check ((select private.has_role('technician')) and assigned_technician_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- audit_log: read-only for managers and viewers
-- ---------------------------------------------------------------------------
create policy audit_log_select on public.audit_log
  for select to authenticated
  using ((select private.has_role('manager', 'viewer')));
