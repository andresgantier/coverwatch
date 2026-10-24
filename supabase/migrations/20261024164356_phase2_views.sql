-- Phase 2d: views for calculated states and KPIs. The app reads from these.
-- security_invoker = true: each view respects the RLS of the user who queries it.
-- Rules (see docs/PROJECT_BRIEF.md section 5):
--   decision deadline   = end_date - notice_period_days
--   expiring soon       = ACTIVE and decision deadline <= today + 90 days
--   SLA met             = first_response_at - reported_at <= sla_hours
--   availability (90 d) = 1 - failure hours / hours in the period
--   plan compliance     = visits done on time / visits that were due
-- A visit counts as "on time" when done no later than 14 days after its due date.

-- ---------------------------------------------------------------------------
-- Contracts with calculated status and decision deadline
-- ---------------------------------------------------------------------------
create view public.v_contracts with (security_invoker = true) as
select
  c.id,
  c.contract_number,
  c.customer_id,
  cu.name as customer_name,
  c.contract_type,
  c.status,
  case
    when c.status = 'ACTIVE' and c.end_date - c.notice_period_days <= private.today() + 90 then 'EXPIRING_SOON'
    else c.status::text
  end as display_status,
  c.start_date,
  c.end_date,
  c.notice_period_days,
  c.end_date - c.notice_period_days as decision_deadline,
  (c.end_date - c.notice_period_days) - private.today() as days_to_decision,
  c.auto_renew,
  c.annual_value_eur,
  c.billing_frequency,
  c.sla_p1_hours,
  c.sla_p2_hours,
  c.sla_p3_hours,
  c.preventive_visits_per_year,
  c.previous_contract_id,
  prev.contract_number as previous_contract_number,
  nxt.id as next_contract_id,
  nxt.contract_number as next_contract_number,
  (select count(*) from public.contract_equipment ce where ce.contract_id = c.id) as equipment_count,
  (c.status = 'ACTIVE' and private.today() between c.start_date and c.end_date) as is_in_force,
  c.pdf_path,
  c.notes,
  c.activated_at,
  c.terminated_on,
  c.termination_reason,
  c.created_at,
  c.updated_at
from public.contracts c
join public.customers cu on cu.id = c.customer_id
left join public.contracts prev on prev.id = c.previous_contract_id
left join public.contracts nxt on nxt.previous_contract_id = c.id;

-- ---------------------------------------------------------------------------
-- Renewal pipeline: active contracts by decision deadline (overdue, 30, 60, 90 days)
-- ---------------------------------------------------------------------------
create view public.v_renewal_pipeline with (security_invoker = true) as
select
  vc.id,
  vc.contract_number,
  vc.customer_id,
  vc.customer_name,
  vc.contract_type,
  vc.end_date,
  vc.notice_period_days,
  vc.decision_deadline,
  vc.days_to_decision,
  vc.auto_renew,
  vc.annual_value_eur,
  case
    when vc.days_to_decision < 0 then 'OVERDUE'
    when vc.days_to_decision <= 30 then 'DUE_30'
    when vc.days_to_decision <= 60 then 'DUE_60'
    else 'DUE_90'
  end as bucket
from public.v_contracts vc
where vc.status = 'ACTIVE'
  and vc.decision_deadline <= private.today() + 90;

-- ---------------------------------------------------------------------------
-- Equipment with its current coverage
-- ---------------------------------------------------------------------------
create view public.v_equipment with (security_invoker = true) as
select
  e.id,
  e.serial_number,
  e.manufacturer,
  e.model,
  e.equipment_type,
  e.cooling_capacity_kw,
  e.install_date,
  e.warranty_end_date,
  (e.warranty_end_date is not null and e.warranty_end_date >= private.today()) as in_warranty,
  e.status,
  e.notes,
  e.site_id,
  s.name as site_name,
  s.city,
  s.customer_id,
  cu.name as customer_name,
  cov.contract_id as current_contract_id,
  cov.contract_number as current_contract_number,
  (cov.contract_id is not null) as is_covered,
  e.created_at,
  e.updated_at
from public.equipment e
join public.sites s on s.id = e.site_id
join public.customers cu on cu.id = s.customer_id
left join lateral (
  select ce.contract_id, c.contract_number
  from public.contract_equipment ce
  join public.contracts c on c.id = ce.contract_id
  where ce.equipment_id = e.id and ce.is_binding and ce.coverage @> private.today()
  limit 1
) cov on true;

-- ---------------------------------------------------------------------------
-- Service requests with SLA evaluation and billable flag
-- ---------------------------------------------------------------------------
create view public.v_service_requests with (security_invoker = true) as
select
  sr.id,
  sr.ticket_number,
  sr.equipment_id,
  e.serial_number,
  e.manufacturer,
  e.model,
  e.equipment_type,
  e.site_id,
  s.name as site_name,
  s.street,
  s.postal_code,
  s.city,
  s.customer_id,
  cu.name as customer_name,
  sr.reported_at,
  sr.reported_by_name,
  sr.priority,
  sr.description,
  sr.status,
  sr.assigned_technician_id,
  t.full_name as technician_name,
  sr.first_response_at,
  sr.resolved_at,
  sr.resolution_notes,
  sr.failure_start,
  sr.failure_end,
  sr.covering_contract_id,
  c.contract_number as covering_contract_number,
  sr.sla_hours,
  sr.reported_at + make_interval(hours => sr.sla_hours) as sla_due_at,
  round(extract(epoch from sr.first_response_at - sr.reported_at) / 3600.0, 2) as response_hours,
  case
    when sr.sla_hours is null then 'NO_SLA'
    when sr.first_response_at is not null then
      case when sr.first_response_at <= sr.reported_at + make_interval(hours => sr.sla_hours)
           then 'MET' else 'BREACHED' end
    when sr.status = 'CANCELLED' then 'NO_SLA'
    when now() > sr.reported_at + make_interval(hours => sr.sla_hours) then 'BREACHED'
    else 'PENDING'
  end as sla_status,
  (sr.covering_contract_id is null) as is_billable,
  sr.created_at,
  sr.updated_at
from public.service_requests sr
join public.equipment e on e.id = sr.equipment_id
join public.sites s on s.id = e.site_id
join public.customers cu on cu.id = s.customer_id
left join public.profiles t on t.id = sr.assigned_technician_id
left join public.contracts c on c.id = sr.covering_contract_id;

-- ---------------------------------------------------------------------------
-- Preventive visits with overdue / on-time flags and where to go
-- ---------------------------------------------------------------------------
create view public.v_preventive_visits with (security_invoker = true) as
select
  v.id,
  v.contract_id,
  c.contract_number,
  c.customer_id,
  cu.name as customer_name,
  v.visit_number,
  v.due_date,
  v.scheduled_date,
  coalesce(v.scheduled_date, v.due_date) as planned_date,
  v.assigned_technician_id,
  t.full_name as technician_name,
  v.status,
  v.actual_date,
  v.result,
  v.observations,
  (v.status = 'PLANNED' and coalesce(v.scheduled_date, v.due_date) < private.today()) as is_overdue,
  (v.status = 'DONE' and v.actual_date <= v.due_date + 14) as done_on_time,
  (v.status <> 'CANCELLED' and v.due_date + 14 < private.today()) as counts_for_compliance,
  locs.sites,
  locs.equipment_count,
  v.created_at,
  v.updated_at
from public.preventive_visits v
join public.contracts c on c.id = v.contract_id
join public.customers cu on cu.id = c.customer_id
left join public.profiles t on t.id = v.assigned_technician_id
left join lateral (
  select string_agg(distinct s.name || ', ' || s.street || ', ' || s.postal_code || ' ' || s.city, ' | ') as sites,
         count(*) as equipment_count
  from public.contract_equipment ce
  join public.equipment e on e.id = ce.equipment_id
  join public.sites s on s.id = e.site_id
  where ce.contract_id = v.contract_id
) locs on true;

-- ---------------------------------------------------------------------------
-- Equipment availability over the last 90 days
-- ---------------------------------------------------------------------------
create view public.v_equipment_availability with (security_invoker = true) as
select
  e.id as equipment_id,
  e.serial_number,
  e.equipment_type,
  s.customer_id,
  cu.name as customer_name,
  s.name as site_name,
  round(dt.downtime_hours, 1) as downtime_hours_90d,
  round(greatest(0, 1 - dt.downtime_hours / (90 * 24.0)), 4) as availability_90d
from public.equipment e
join public.sites s on s.id = e.site_id
join public.customers cu on cu.id = s.customer_id
cross join lateral (
  select coalesce(sum(extract(epoch from
           least(coalesce(sr.failure_end, now()), now()) - greatest(sr.failure_start, now() - interval '90 days')
         ) / 3600.0), 0) as downtime_hours
  from public.service_requests sr
  where sr.equipment_id = e.id
    and sr.failure_start is not null
    and sr.failure_start < now()
    and coalesce(sr.failure_end, now()) > now() - interval '90 days'
) dt
where e.status = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- Customer 360 summary
-- ---------------------------------------------------------------------------
create view public.v_customer_summary with (security_invoker = true) as
select
  cu.id,
  cu.customer_number,
  cu.name,
  cu.segment,
  cu.is_active,
  (select count(*) from public.sites s where s.customer_id = cu.id) as sites_count,
  (select count(*) from public.v_equipment ve where ve.customer_id = cu.id and ve.status = 'ACTIVE') as equipment_count,
  (select count(*) from public.v_equipment ve
    where ve.customer_id = cu.id and ve.status = 'ACTIVE' and ve.is_covered) as covered_equipment_count,
  (select count(*) from public.contracts c where c.customer_id = cu.id and c.status = 'ACTIVE') as active_contracts,
  (select coalesce(sum(c.annual_value_eur), 0) from public.contracts c
    where c.customer_id = cu.id and c.status = 'ACTIVE') as annual_value_eur,
  (select count(*) from public.v_service_requests t where t.customer_id = cu.id and t.status = 'OPEN') as open_tickets,
  (select round(100.0 * count(*) filter (where t.sla_status = 'MET')
                / nullif(count(*) filter (where t.sla_status in ('MET', 'BREACHED')), 0), 1)
     from public.v_service_requests t
    where t.customer_id = cu.id and t.reported_at >= now() - interval '90 days') as sla_met_pct_90d,
  (select count(*) from public.v_preventive_visits v where v.customer_id = cu.id and v.is_overdue) as overdue_visits,
  (select round(avg(a.availability_90d), 4) from public.v_equipment_availability a
    where a.customer_id = cu.id) as availability_90d,
  (select count(*) from public.v_service_requests t
    where t.customer_id = cu.id and t.is_billable and t.reported_at >= now() - interval '90 days') as billable_tickets_90d
from public.customers cu;

-- ---------------------------------------------------------------------------
-- Dashboard KPIs (one row)
-- ---------------------------------------------------------------------------
create view public.v_dashboard_kpis with (security_invoker = true) as
select
  (select count(*) from public.contracts where status = 'ACTIVE') as active_contracts,
  (select coalesce(sum(annual_value_eur), 0) from public.contracts where status = 'ACTIVE') as portfolio_annual_value_eur,
  (select count(*) from public.v_renewal_pipeline where bucket <> 'OVERDUE') as renewals_90d_count,
  (select coalesce(sum(annual_value_eur), 0) from public.v_renewal_pipeline where bucket <> 'OVERDUE') as renewals_90d_value_eur,
  (select count(*) from public.v_renewal_pipeline where bucket = 'OVERDUE') as overdue_decisions_count,
  (select coalesce(sum(annual_value_eur), 0) from public.v_renewal_pipeline where bucket = 'OVERDUE') as overdue_decisions_value_eur,
  (select round(100.0 * count(*) filter (where sla_status = 'MET')
                / nullif(count(*) filter (where sla_status in ('MET', 'BREACHED')), 0), 1)
     from public.v_service_requests where reported_at >= now() - interval '90 days') as sla_met_pct_90d,
  (select count(*) from public.v_preventive_visits where is_overdue) as overdue_visits,
  (select round(100.0 * count(*) filter (where done_on_time) / nullif(count(*), 0), 1)
     from public.v_preventive_visits
    where counts_for_compliance and due_date >= private.today() - 365) as plan_compliance_pct_12m,
  (select count(*) from public.service_requests where status = 'OPEN' and priority = 'P1') as open_tickets_p1,
  (select count(*) from public.service_requests where status = 'OPEN' and priority = 'P2') as open_tickets_p2,
  (select count(*) from public.service_requests where status = 'OPEN' and priority = 'P3') as open_tickets_p3,
  (select round(avg(availability_90d), 4) from public.v_equipment_availability) as availability_90d,
  (select count(*) from public.service_requests
    where covering_contract_id is null and reported_at >= now() - interval '90 days') as billable_tickets_90d,
  (select count(*) from public.equipment where status = 'ACTIVE') as equipment_count,
  (select count(*) from public.v_equipment where status = 'ACTIVE' and is_covered) as covered_equipment_count;

-- ---------------------------------------------------------------------------
-- Alerts: what needs action today
-- ---------------------------------------------------------------------------
create view public.v_alerts with (security_invoker = true) as
select
  'RENEWAL_DECISION' as alert_type,
  case when rp.days_to_decision < 0 then 'HIGH' else 'MEDIUM' end as severity,
  rp.id as entity_id,
  rp.contract_number as reference,
  rp.customer_name,
  case when rp.days_to_decision < 0
       then 'Renewal decision overdue by ' || -rp.days_to_decision || ' days'
       else 'Renewal decision due in ' || rp.days_to_decision || ' days' end as title,
  rp.decision_deadline as due_date,
  null::uuid as technician_id
from public.v_renewal_pipeline rp
where rp.days_to_decision <= 30
union all
select
  'OVERDUE_VISIT',
  case when v.planned_date < private.today() - 30 then 'HIGH' else 'MEDIUM' end,
  v.id,
  v.contract_number || ' #' || v.visit_number,
  v.customer_name,
  'Preventive visit overdue since ' || to_char(v.planned_date, 'YYYY-MM-DD'),
  v.planned_date,
  v.assigned_technician_id
from public.v_preventive_visits v
where v.is_overdue
union all
select
  'SLA_BREACH',
  case when t.priority = 'P1' then 'HIGH' else 'MEDIUM' end,
  t.id,
  t.ticket_number,
  t.customer_name,
  t.priority || ' ticket out of SLA (' || t.sla_hours || ' h)',
  (t.sla_due_at at time zone 'Europe/Berlin')::date,
  t.assigned_technician_id
from public.v_service_requests t
where t.status = 'OPEN' and t.sla_status = 'BREACHED';

-- ---------------------------------------------------------------------------
-- Audit log with the name of who made each change
-- ---------------------------------------------------------------------------
create view public.v_audit_log with (security_invoker = true) as
select
  a.id,
  a.table_name,
  a.record_id,
  a.action,
  a.changed_by,
  p.full_name as changed_by_name,
  a.changed_at,
  a.old_data,
  a.new_data
from public.audit_log a
left join public.profiles p on p.id = a.changed_by;
