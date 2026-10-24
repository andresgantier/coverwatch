-- Phase 3: mark demo customers so the demo seed script only ever deletes its own data.
alter table public.customers add column is_demo boolean not null default false;
comment on column public.customers.is_demo is
  'True for synthetic demo data created by scripts/seed.mjs. The seed only deletes rows linked to demo customers.';
