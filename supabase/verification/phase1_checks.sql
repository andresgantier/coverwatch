-- Phase 1 verification: valid and invalid inserts against the data model rules.
-- All test data is rolled back at the end, so it never leaves anything behind.
-- Run with: npx supabase db query --linked -f supabase/verification/phase1_checks.sql
-- (or paste into the Supabase SQL Editor).

-- Runs one statement and reports whether the database accepted or rejected it.
create function pg_temp.try(p_sql text)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return 'ACCEPTED';
exception when others then
  return 'REJECTED: ' || sqlerrm;
end;
$$;

create function pg_temp.run_checks()
returns table (n bigint, test text, expected text, check_result text, outcome text)
language plpgsql
as $$
declare
  r jsonb := '[]';
begin
  begin
    -- Valid base data
    insert into public.customers (id, name, segment)
    values ('11111111-1111-1111-1111-111111111111', 'Test Clinic GmbH', 'CLINIC');

    insert into public.sites (id, customer_id, name, street, postal_code, city)
    values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
            'Main building', 'Teststr. 1', '45127', 'Essen');

    insert into public.equipment (id, site_id, serial_number, manufacturer, model, equipment_type,
                                  cooling_capacity_kw, install_date, warranty_end_date)
    values ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222',
            'TEST-SN-001', 'Daikin', 'FTXM35R', 'SPLIT_AC', 3.5, '2024-05-01', '2027-05-01');

    -- A: active 2026. B: draft overlapping A. C: active 2027 (renewal, no overlap).
    -- D: active, overlapping A, no units yet.
    insert into public.contracts (id, contract_number, customer_id, contract_type, status, start_date, end_date,
                                  notice_period_days, annual_value_eur, sla_p1_hours, sla_p2_hours, sla_p3_hours,
                                  preventive_visits_per_year, activated_at)
    values
      ('44444444-4444-4444-4444-444444444441', 'TEST-A', '11111111-1111-1111-1111-111111111111', 'FULL_SERVICE',
       'ACTIVE', '2026-01-01', '2026-12-31', 90, 4800, 4, 8, 24, 2, now()),
      ('44444444-4444-4444-4444-444444444442', 'TEST-B', '11111111-1111-1111-1111-111111111111', 'PREVENTIVE',
       'DRAFT',  '2026-07-01', '2027-06-30', 60, 2400, 8, 24, 48, 2, null),
      ('44444444-4444-4444-4444-444444444443', 'TEST-C', '11111111-1111-1111-1111-111111111111', 'FULL_SERVICE',
       'ACTIVE', '2027-01-01', '2027-12-31', 90, 5000, 4, 8, 24, 2, now()),
      ('44444444-4444-4444-4444-444444444444', 'TEST-D', '11111111-1111-1111-1111-111111111111', 'ON_CALL',
       'ACTIVE', '2026-03-01', '2027-02-28', 30, 1200, 8, 24, 48, 0, now());

    insert into public.contract_equipment (contract_id, equipment_id)
    values ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331');

    -- Coverage rules (EXCLUDE constraint)
    r := r || jsonb_build_object('t', 'Unit in a second ACTIVE contract with overlapping dates', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.contract_equipment (contract_id, equipment_id)
        values ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333331')$q$));

    r := r || jsonb_build_object('t', 'Unit added to an overlapping DRAFT contract', 'e', 'ACCEPTED',
      'o', pg_temp.try($q$insert into public.contract_equipment (contract_id, equipment_id)
        values ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333331')$q$));

    r := r || jsonb_build_object('t', 'Activating that overlapping DRAFT contract', 'e', 'REJECTED',
      'o', pg_temp.try($q$update public.contracts set status = 'ACTIVE', activated_at = now()
        where id = '44444444-4444-4444-4444-444444444442'$q$));

    r := r || jsonb_build_object('t', 'Unit in the next-year ACTIVE contract (renewal, no overlap)', 'e', 'ACCEPTED',
      'o', pg_temp.try($q$insert into public.contract_equipment (contract_id, equipment_id)
        values ('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333331')$q$));

    -- Contract checks
    r := r || jsonb_build_object('t', 'Contract that ends before it starts', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.contracts (contract_number, customer_id, contract_type, start_date,
          end_date, annual_value_eur, sla_p1_hours, sla_p2_hours, sla_p3_hours)
        values ('TEST-E', '11111111-1111-1111-1111-111111111111', 'ON_CALL', '2026-12-31', '2026-01-01',
          1000, 4, 8, 24)$q$));

    r := r || jsonb_build_object('t', 'Contract with P1 SLA slower than P2', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.contracts (contract_number, customer_id, contract_type, start_date,
          end_date, annual_value_eur, sla_p1_hours, sla_p2_hours, sla_p3_hours)
        values ('TEST-F', '11111111-1111-1111-1111-111111111111', 'ON_CALL', '2026-01-01', '2026-12-31',
          1000, 24, 8, 48)$q$));

    r := r || jsonb_build_object('t', 'Contract terminated without a reason', 'e', 'REJECTED',
      'o', pg_temp.try($q$update public.contracts set status = 'TERMINATED', terminated_on = '2026-06-30'
        where id = '44444444-4444-4444-4444-444444444441'$q$));

    r := r || jsonb_build_object('t', 'Duplicate contract number', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.contracts (contract_number, customer_id, contract_type, start_date,
          end_date, annual_value_eur, sla_p1_hours, sla_p2_hours, sla_p3_hours)
        values ('TEST-A', '11111111-1111-1111-1111-111111111111', 'ON_CALL', '2026-01-01', '2026-12-31',
          1000, 4, 8, 24)$q$));

    -- Master data checks
    r := r || jsonb_build_object('t', 'Site with an invalid German postal code', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.sites (customer_id, name, street, postal_code, city)
        values ('11111111-1111-1111-1111-111111111111', 'Annex', 'Teststr. 2', 'ABC', 'Essen')$q$));

    r := r || jsonb_build_object('t', 'Equipment with a duplicate serial number', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.equipment (site_id, serial_number, manufacturer, model,
          equipment_type, cooling_capacity_kw, install_date)
        values ('22222222-2222-2222-2222-222222222222', 'TEST-SN-001', 'Mitsubishi', 'MSZ-LN', 'SPLIT_AC',
          2.5, '2025-01-01')$q$));

    -- Ticket and visit checks
    r := r || jsonb_build_object('t', 'Ticket answered before it was reported', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.service_requests (equipment_id, reported_at, priority, description,
          first_response_at)
        values ('33333333-3333-3333-3333-333333333331', '2026-08-01 10:00+02', 'P1', 'No cooling',
          '2026-08-01 09:00+02')$q$));

    r := r || jsonb_build_object('t', 'Ticket marked RESOLVED without resolution time', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.service_requests (equipment_id, priority, description, status)
        values ('33333333-3333-3333-3333-333333333331', 'P2', 'Noise', 'RESOLVED')$q$));

    r := r || jsonb_build_object('t', 'Valid ticket', 'e', 'ACCEPTED',
      'o', pg_temp.try($q$insert into public.service_requests (equipment_id, reported_at, priority, description,
          first_response_at)
        values ('33333333-3333-3333-3333-333333333331', '2026-08-01 10:00+02', 'P1', 'No cooling',
          '2026-08-01 12:30+02')$q$));

    r := r || jsonb_build_object('t', 'Visit marked DONE without date and result', 'e', 'REJECTED',
      'o', pg_temp.try($q$insert into public.preventive_visits (contract_id, visit_number, due_date, status)
        values ('44444444-4444-4444-4444-444444444441', 1, '2026-06-30', 'DONE')$q$));

    -- Undo all test data (the results live in the variable r, not in a table).
    raise exception 'rollback test data' using errcode = 'U0001';
  exception when sqlstate 'U0001' then
    null;
  end;

  return query
    select x.ord, x.item->>'t', x.item->>'e',
           case when x.item->>'o' like (x.item->>'e') || '%' then 'PASS' else 'FAIL' end,
           x.item->>'o'
    from jsonb_array_elements(r) with ordinality as x(item, ord)
    order by x.ord;
end;
$$;

select * from pg_temp.run_checks();
