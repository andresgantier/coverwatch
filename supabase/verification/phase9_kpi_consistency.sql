-- Phase 9 verification: every dashboard KPI equals the count of the list it links to.
-- Each "list" value uses the same filter as the page behind the tile.
-- Run with: npx supabase db query --linked -f supabase/verification/phase9_kpi_consistency.sql
with k as (select * from public.v_dashboard_kpis),
checks(kpi, dashboard, list) as (
  select 'Active contracts (/contracts?status=ACTIVE)',
         (select active_contracts::text from k),
         (select count(*)::text from public.v_contracts where status = 'ACTIVE')
  union all
  select 'Portfolio annual value (/contracts?status=ACTIVE)',
         (select portfolio_annual_value_eur::text from k),
         (select coalesce(sum(annual_value_eur), 0)::text from public.v_contracts where status = 'ACTIVE')
  union all
  select 'Renewals due in 90 days (/renewals, not overdue)',
         (select renewals_90d_count::text from k),
         (select count(*)::text from public.v_renewal_pipeline where bucket <> 'OVERDUE')
  union all
  select 'Renewal decisions overdue (/renewals, overdue column)',
         (select overdue_decisions_count::text from k),
         (select count(*)::text from public.v_contracts where status = 'ACTIVE' and decision_deadline < private.today())
  union all
  select 'Overdue visits (/visits?view=overdue)',
         (select overdue_visits::text from k),
         (select count(*)::text from public.v_preventive_visits where is_overdue)
  union all
  select 'Open P1 tickets (/service-requests, P1)',
         (select open_tickets_p1::text from k),
         (select count(*)::text from public.v_service_requests where status = 'OPEN' and priority = 'P1')
  union all
  select 'Open tickets total (/service-requests)',
         (select (open_tickets_p1 + open_tickets_p2 + open_tickets_p3)::text from k),
         (select count(*)::text from public.v_service_requests where status = 'OPEN')
  union all
  select 'Billable tickets 90 days (/service-requests?status=all&billable=yes&period=90d)',
         (select billable_tickets_90d::text from k),
         (select count(*)::text from public.v_service_requests where is_billable and reported_at >= now() - interval '90 days')
  union all
  select 'SLA met % 90 days (/service-requests?status=all&period=90d summary)',
         (select sla_met_pct_90d::text from k),
         (select round(100.0 * count(*) filter (where sla_status = 'MET')
                 / nullif(count(*) filter (where sla_status in ('MET', 'BREACHED')), 0), 1)::text
            from public.v_service_requests where reported_at >= now() - interval '90 days')
  union all
  select 'Covered units today (/equipment?coverage=covered, in service)',
         (select covered_equipment_count::text from k),
         (select count(*)::text from public.v_equipment where status = 'ACTIVE' and is_covered)
  union all
  select 'Alerts: renewal decisions = pipeline rows due <= 30 days',
         (select count(*)::text from public.v_alerts where alert_type = 'RENEWAL_DECISION'),
         (select count(*)::text from public.v_renewal_pipeline where days_to_decision <= 30)
  union all
  select 'Alerts: overdue visits = /visits?view=overdue',
         (select count(*)::text from public.v_alerts where alert_type = 'OVERDUE_VISIT'),
         (select count(*)::text from public.v_preventive_visits where is_overdue)
  union all
  select 'Customer KPIs add up: annual value of all customers = portfolio',
         (select portfolio_annual_value_eur::text from k),
         (select sum(annual_value_eur)::text from public.v_customer_summary)
)
select kpi, dashboard, list, case when dashboard = list then 'PASS' else 'FAIL' end as check_result
from checks;
