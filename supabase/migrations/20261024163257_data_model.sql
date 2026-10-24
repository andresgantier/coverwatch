-- Phase 1: core data model (tables, types, constraints, indexes).
-- Business logic (views, actions, audit triggers, RLS policies) comes in Phase 2.

-- Needed so an EXCLUDE constraint can combine "=" on uuid with "&&" on date ranges.
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('manager', 'coordinator', 'technician', 'viewer');
create type public.customer_segment as enum ('OFFICE', 'CLINIC', 'HOTEL', 'RETAIL', 'SCHOOL', 'SERVER_ROOM', 'OTHER');
create type public.equipment_type as enum ('SPLIT_AC', 'MULTI_SPLIT', 'HEAT_PUMP', 'VENTILATION', 'CHILLER');
create type public.equipment_status as enum ('ACTIVE', 'DECOMMISSIONED');
create type public.contract_type as enum ('FULL_SERVICE', 'PREVENTIVE', 'ON_CALL');
create type public.contract_status as enum ('DRAFT', 'ACTIVE', 'EXPIRED', 'RENEWED', 'TERMINATED');
create type public.billing_frequency as enum ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');
create type public.ticket_priority as enum ('P1', 'P2', 'P3');
create type public.ticket_status as enum ('OPEN', 'RESOLVED', 'CANCELLED');
create type public.visit_status as enum ('PLANNED', 'DONE', 'CANCELLED');
create type public.visit_result as enum ('OK', 'ISSUES_FOUND', 'FOLLOW_UP_REQUIRED');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per app user (managers, coordinators, technicians, viewers)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete restrict,
  full_name   text not null check (btrim(full_name) <> ''),
  email       text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text,
  role        public.user_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'App users and their role. Technicians are profiles with role = technician.';

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create sequence public.customer_number_seq;

create table public.customers (
  id               uuid primary key default gen_random_uuid(),
  customer_number  text not null unique
                   default 'C-' || lpad(nextval('public.customer_number_seq')::text, 4, '0'),
  name             text not null unique check (btrim(name) <> ''),
  segment          public.customer_segment not null,
  contact_name     text,
  contact_email    text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone    text,
  notes            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter sequence public.customer_number_seq owned by public.customers.customer_number;
comment on table public.customers is 'B2B customers (offices, clinics, hotels, shops, schools, server rooms).';

-- ---------------------------------------------------------------------------
-- sites: buildings/locations of a customer where equipment is installed
-- ---------------------------------------------------------------------------
create table public.sites (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers (id) on delete restrict,
  name           text not null check (btrim(name) <> ''),
  street         text not null check (btrim(street) <> ''),
  postal_code    text not null check (postal_code ~ '^\d{5}$'),
  city           text not null check (btrim(city) <> ''),
  contact_name   text,
  contact_phone  text,
  contact_email  text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (customer_id, name)
);
comment on table public.sites is 'Customer locations. Postal codes follow the German 5-digit format.';

-- ---------------------------------------------------------------------------
-- equipment: installed HVAC units
-- ---------------------------------------------------------------------------
create table public.equipment (
  id                   uuid primary key default gen_random_uuid(),
  site_id              uuid not null references public.sites (id) on delete restrict,
  serial_number        text not null unique check (btrim(serial_number) <> ''),
  manufacturer         text not null check (btrim(manufacturer) <> ''),
  model                text not null check (btrim(model) <> ''),
  equipment_type       public.equipment_type not null,
  cooling_capacity_kw  numeric(7,1) not null check (cooling_capacity_kw > 0 and cooling_capacity_kw <= 2000),
  install_date         date not null,
  warranty_end_date    date,
  status               public.equipment_status not null default 'ACTIVE',
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (warranty_end_date is null or warranty_end_date >= install_date)
);
comment on table public.equipment is 'Installed units (split AC, heat pumps, ventilation, chillers).';

-- ---------------------------------------------------------------------------
-- contracts: maintenance contracts; renewals are new rows linked to the previous one
-- ---------------------------------------------------------------------------
create table public.contracts (
  id                        uuid primary key default gen_random_uuid(),
  contract_number           text not null unique check (btrim(contract_number) <> ''),
  customer_id               uuid not null references public.customers (id) on delete restrict,
  contract_type             public.contract_type not null,
  status                    public.contract_status not null default 'DRAFT',
  start_date                date not null,
  end_date                  date not null,
  notice_period_days        integer not null default 90,
  auto_renew                boolean not null default false,
  annual_value_eur          numeric(12,2) not null check (annual_value_eur >= 0),
  billing_frequency         public.billing_frequency not null default 'ANNUAL',
  sla_p1_hours              integer not null,
  sla_p2_hours              integer not null,
  sla_p3_hours              integer not null,
  preventive_visits_per_year integer not null default 0 check (preventive_visits_per_year between 0 and 12),
  pdf_path                  text,
  notes                     text,
  previous_contract_id      uuid unique references public.contracts (id) on delete restrict,
  activated_at              timestamptz,
  terminated_on             date,
  termination_reason        text,
  created_by                uuid references public.profiles (id) on delete restrict,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint contracts_dates_chk check (end_date > start_date),
  constraint contracts_notice_chk check (notice_period_days between 0 and 365
                                         and notice_period_days < end_date - start_date),
  constraint contracts_sla_chk check (sla_p1_hours > 0 and sla_p1_hours <= sla_p2_hours
                                      and sla_p2_hours <= sla_p3_hours),
  constraint contracts_not_self_renewal_chk check (previous_contract_id <> id),
  constraint contracts_termination_chk check (
    (status = 'TERMINATED') = (terminated_on is not null)
    and (terminated_on is null or (termination_reason is not null and btrim(termination_reason) <> ''))
  )
);
comment on table public.contracts is
  'Maintenance contracts. Never deleted: they change status or are renewed as a new version (previous_contract_id).';
comment on column public.contracts.notice_period_days is
  'Days before end_date by which the customer or company must decide on renewal/termination.';

-- ---------------------------------------------------------------------------
-- contract_equipment: which units a contract covers
-- coverage and is_active_contract are copied from the contract (kept in sync by
-- triggers below) because an EXCLUDE constraint can only compare columns of one table.
-- ---------------------------------------------------------------------------
create table public.contract_equipment (
  contract_id         uuid not null references public.contracts (id) on delete restrict,
  equipment_id        uuid not null references public.equipment (id) on delete restrict,
  coverage            daterange not null,
  is_active_contract  boolean not null default false,
  created_at          timestamptz not null default now(),
  primary key (contract_id, equipment_id),
  -- A unit cannot be covered by two ACTIVE contracts with overlapping dates.
  constraint contract_equipment_no_overlap
    exclude using gist (equipment_id with =, coverage with &&) where (is_active_contract)
);
comment on table public.contract_equipment is 'Units covered by each contract (many-to-many).';

-- Copy the contract period and status onto the link row.
create function public.contract_equipment_copy_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select daterange(c.start_date, c.end_date, '[]'), c.status = 'ACTIVE'
    into new.coverage, new.is_active_contract
  from public.contracts c
  where c.id = new.contract_id;
  return new;
end;
$$;

create trigger contract_equipment_copy_contract
before insert or update on public.contract_equipment
for each row execute function public.contract_equipment_copy_contract();

-- When a contract's dates or status change, refresh its link rows
-- (this re-checks the overlap constraint, e.g. on activation).
create function public.contracts_sync_equipment_coverage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contract_equipment
     set coverage = daterange(new.start_date, new.end_date, '[]'),
         is_active_contract = (new.status = 'ACTIVE')
   where contract_id = new.id;
  return null;
end;
$$;

create trigger contracts_sync_equipment_coverage
after update of start_date, end_date, status on public.contracts
for each row execute function public.contracts_sync_equipment_coverage();

-- ---------------------------------------------------------------------------
-- service_requests: breakdown tickets
-- covering_contract_id / sla_hours are a snapshot taken by the database when the
-- ticket is created (logic in Phase 2). Null contract = unit not covered = billable.
-- ---------------------------------------------------------------------------
create sequence public.service_request_number_seq;

create table public.service_requests (
  id                      uuid primary key default gen_random_uuid(),
  ticket_number           text not null unique
                          default 'SR-' || lpad(nextval('public.service_request_number_seq')::text, 6, '0'),
  equipment_id            uuid not null references public.equipment (id) on delete restrict,
  reported_at             timestamptz not null default now(),
  reported_by_name        text,
  priority                public.ticket_priority not null,
  description             text not null check (btrim(description) <> ''),
  status                  public.ticket_status not null default 'OPEN',
  assigned_technician_id  uuid references public.profiles (id) on delete restrict,
  first_response_at       timestamptz,
  resolved_at             timestamptz,
  resolution_notes        text,
  failure_start           timestamptz,
  failure_end             timestamptz,
  covering_contract_id    uuid references public.contracts (id) on delete restrict,
  sla_hours               integer check (sla_hours > 0),
  created_by              uuid references public.profiles (id) on delete restrict,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint service_requests_response_chk check (first_response_at is null or first_response_at >= reported_at),
  constraint service_requests_resolved_chk check (resolved_at is null or resolved_at >= reported_at),
  constraint service_requests_status_chk check ((status = 'RESOLVED') = (resolved_at is not null)),
  constraint service_requests_failure_chk check (failure_end is null or (failure_start is not null and failure_end >= failure_start)),
  constraint service_requests_coverage_chk check ((covering_contract_id is null) = (sla_hours is null))
);
alter sequence public.service_request_number_seq owned by public.service_requests.ticket_number;
comment on table public.service_requests is 'Breakdown tickets with SLA (first response) and failure time for availability.';

-- ---------------------------------------------------------------------------
-- preventive_visits: planned maintenance visits generated per contract
-- due_date is fixed when the plan is generated; scheduled_date is set by the coordinator.
-- ---------------------------------------------------------------------------
create table public.preventive_visits (
  id                      uuid primary key default gen_random_uuid(),
  contract_id             uuid not null references public.contracts (id) on delete restrict,
  visit_number            integer not null check (visit_number >= 1),
  due_date                date not null,
  scheduled_date          date,
  assigned_technician_id  uuid references public.profiles (id) on delete restrict,
  status                  public.visit_status not null default 'PLANNED',
  actual_date             date,
  result                  public.visit_result,
  observations            text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (contract_id, visit_number),
  constraint preventive_visits_done_chk check (
    (status = 'DONE') = (actual_date is not null)
    and (status = 'DONE') = (result is not null)
  )
);
comment on table public.preventive_visits is 'Preventive maintenance plan: one row per promised visit.';

-- ---------------------------------------------------------------------------
-- audit_log: who changed what and when (filled by triggers in Phase 2)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by  uuid,
  changed_at  timestamptz not null default now(),
  old_data    jsonb,
  new_data    jsonb
);
comment on table public.audit_log is 'Append-only change history for contracts and service requests.';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger sites_set_updated_at before update on public.sites
  for each row execute function public.set_updated_at();
create trigger equipment_set_updated_at before update on public.equipment
  for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();
create trigger service_requests_set_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();
create trigger preventive_visits_set_updated_at before update on public.preventive_visits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes (foreign keys and the filters used by lists, views and KPIs)
-- ---------------------------------------------------------------------------
create index sites_customer_id_idx on public.sites (customer_id);
create index equipment_site_id_idx on public.equipment (site_id);
create index contracts_customer_id_idx on public.contracts (customer_id);
create index contracts_status_end_date_idx on public.contracts (status, end_date);
create index contract_equipment_equipment_id_idx on public.contract_equipment (equipment_id);
create index service_requests_equipment_id_idx on public.service_requests (equipment_id);
create index service_requests_technician_idx on public.service_requests (assigned_technician_id);
create index service_requests_reported_at_idx on public.service_requests (reported_at);
create index service_requests_open_idx on public.service_requests (priority) where status = 'OPEN';
create index service_requests_contract_idx on public.service_requests (covering_contract_id);
create index preventive_visits_technician_idx on public.preventive_visits (assigned_technician_id);
create index preventive_visits_planned_idx on public.preventive_visits (due_date) where status = 'PLANNED';
create index profiles_role_idx on public.profiles (role);
create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_changed_at_idx on public.audit_log (changed_at);

-- ---------------------------------------------------------------------------
-- Row Level Security: enabled everywhere, no policies yet = no access through
-- the API until Phase 2 adds role-based policies.
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.customers          enable row level security;
alter table public.sites              enable row level security;
alter table public.equipment          enable row level security;
alter table public.contracts          enable row level security;
alter table public.contract_equipment enable row level security;
alter table public.service_requests   enable row level security;
alter table public.preventive_visits  enable row level security;
alter table public.audit_log          enable row level security;
