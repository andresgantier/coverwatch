-- Phase 2 verification: business logic and permissions per role.
-- Creates test users and data, runs each statement as a given role, and rolls
-- everything back at the end, so nothing is left in the database.
-- Run with: npx supabase db query --linked -f supabase/verification/phase2_checks.sql
-- (or paste into the Supabase SQL Editor).

-- Runs one statement as 'admin' (no app role), 'anon' or a user id, and reports:
--   VALUE: x       for a SELECT returning one value
--   OK: n rows     for INSERT/UPDATE/DELETE (0 rows = hidden by RLS)
--   REJECTED: msg  when the database refuses it
create function pg_temp.run(p_who text, p_sql text)
returns text
language plpgsql
as $$
declare
  v_result text;
  v_rows bigint;
begin
  if p_who = 'anon' then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  elsif p_who <> 'admin' then
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_who, 'role', 'authenticated')::text, true);
  end if;

  if p_sql ~* '^\s*select' then
    execute p_sql into v_result;
    v_result := 'VALUE: ' || coalesce(v_result, 'null');
  else
    execute p_sql;
    get diagnostics v_rows = row_count;
    v_result := 'OK: ' || v_rows || ' rows';
  end if;

  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
  return v_result;
exception when others then
  return 'REJECTED: ' || sqlerrm; -- the role switch is undone with the failed statement
end;
$$;

create function pg_temp.run_checks()
returns table (n bigint, who text, test text, expected text, check_result text, outcome text)
language plpgsql
as $$
declare
  r jsonb := '[]';
  d date := private.today();
  -- users
  mgr   text := 'aaaaaaaa-0000-0000-0000-000000000001';
  coord text := 'aaaaaaaa-0000-0000-0000-000000000002';
  techa text := 'aaaaaaaa-0000-0000-0000-000000000003';
  techb text := 'aaaaaaaa-0000-0000-0000-000000000004';
  viewr text := 'aaaaaaaa-0000-0000-0000-000000000005';
  -- data
  k1 text := 'bbbbbbbb-0000-0000-0000-000000000001';
  k2 text := 'bbbbbbbb-0000-0000-0000-000000000002';
  k3 text := 'bbbbbbbb-0000-0000-0000-000000000003';
  t1 text := 'cccccccc-0000-0000-0000-000000000001';
  t2 text := 'cccccccc-0000-0000-0000-000000000002';
  e1 text := 'dddddddd-0000-0000-0000-000000000001';
  e2 text := 'dddddddd-0000-0000-0000-000000000002';

begin
  begin
    -- ---------------- setup (as admin) ----------------
    insert into auth.users (id, email, aud, role, raw_user_meta_data)
    values (mgr::uuid,   'test.manager@example.com',     'authenticated', 'authenticated', '{"full_name":"Test Manager"}'),
           (coord::uuid, 'test.coordinator@example.com', 'authenticated', 'authenticated', '{"full_name":"Test Coordinator"}'),
           (techa::uuid, 'test.tech.a@example.com',      'authenticated', 'authenticated', '{"full_name":"Tech A"}'),
           (techb::uuid, 'test.tech.b@example.com',      'authenticated', 'authenticated', '{"full_name":"Tech B"}'),
           (viewr::uuid, 'test.viewer@example.com',      'authenticated', 'authenticated', '{"full_name":"Test Viewer"}');
    update public.profiles set role = 'manager'     where id = mgr::uuid;
    update public.profiles set role = 'coordinator' where id = coord::uuid;
    update public.profiles set role = 'technician'  where id in (techa::uuid, techb::uuid);

    insert into public.customers (id, name, segment)
    values ('eeeeeeee-0000-0000-0000-000000000001', 'Test Server Room AG', 'SERVER_ROOM');
    insert into public.sites (id, customer_id, name, street, postal_code, city)
    values ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
            'Data center', 'Teststr. 5', '44135', 'Dortmund');
    insert into public.equipment (id, site_id, serial_number, manufacturer, model, equipment_type, cooling_capacity_kw, install_date)
    values (e1::uuid, 'ffffffff-0000-0000-0000-000000000001', 'T2-SN-001', 'Daikin', 'FTXM50R', 'SPLIT_AC', 5.0, d - 800),
           (e2::uuid, 'ffffffff-0000-0000-0000-000000000001', 'T2-SN-002', 'Stulz',  'CyberAir', 'CHILLER', 40.0, d - 800),
           ('dddddddd-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000001', 'T2-SN-003', 'Vaillant', 'aroTHERM', 'HEAT_PUMP', 8.0, d - 800),
           ('dddddddd-0000-0000-0000-000000000004', 'ffffffff-0000-0000-0000-000000000001', 'T2-SN-004', 'Wolf', 'CWL-300', 'VENTILATION', 2.0, d - 800);

    -- K1: one year running since 200 days ago, decision deadline in 74 days. K2: draft without units.
    insert into public.contracts (id, contract_number, customer_id, contract_type, start_date, end_date,
                                  notice_period_days, annual_value_eur, sla_p1_hours, sla_p2_hours, sla_p3_hours,
                                  preventive_visits_per_year)
    values (k1::uuid, 'T2-K1', 'eeeeeeee-0000-0000-0000-000000000001', 'FULL_SERVICE', d - 200, d + 164, 90, 6000, 4, 8, 24, 2),
           (k2::uuid, 'T2-K2', 'eeeeeeee-0000-0000-0000-000000000001', 'PREVENTIVE',   d - 10,  d + 354, 60, 1500, 8, 24, 48, 1);
    insert into public.contract_equipment (contract_id, equipment_id) values (k1::uuid, e1::uuid);

    -- K4 / K5: ended yesterday, without and with auto-renewal (for the daily expiry job).
    insert into public.contracts (id, contract_number, customer_id, contract_type, status, start_date, end_date,
                                  notice_period_days, auto_renew, annual_value_eur, sla_p1_hours, sla_p2_hours, sla_p3_hours)
    values ('bbbbbbbb-0000-0000-0000-000000000004', 'T2-K4', 'eeeeeeee-0000-0000-0000-000000000001', 'ON_CALL', 'ACTIVE',
            d - 366, d - 1, 30, false, 900, 8, 24, 48),
           ('bbbbbbbb-0000-0000-0000-000000000005', 'T2-K5', 'eeeeeeee-0000-0000-0000-000000000001', 'ON_CALL', 'ACTIVE',
            d - 366, d - 1, 30, true, 900, 8, 24, 48);
    insert into public.contract_equipment (contract_id, equipment_id)
    values ('bbbbbbbb-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000003'),
           ('bbbbbbbb-0000-0000-0000-000000000005', 'dddddddd-0000-0000-0000-000000000004');

    -- ---------------- contract lifecycle ----------------
    r := r || jsonb_build_object('w', 'manager', 't', 'Activate a contract without equipment', 'e', 'REJECTED',
      'o', pg_temp.run(mgr, format('select public.activate_contract(%L)', k2)));
    r := r || jsonb_build_object('w', 'coordinator', 't', 'Coordinator activates a contract', 'e', 'REJECTED',
      'o', pg_temp.run(coord, format('select public.activate_contract(%L)', k1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Manager activates a contract', 'e', 'VALUE: ACTIVE',
      'o', pg_temp.run(mgr, format('select (public.activate_contract(%L)).status', k1)));
    r := r || jsonb_build_object('w', 'admin', 't', 'Activation generated the preventive plan (2 visits/year)', 'e', 'VALUE: 2',
      'o', pg_temp.run('admin', format('select count(*) from public.preventive_visits where contract_id = %L', k1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Renewal pipeline: decision in 74 days -> bucket DUE_90', 'e', 'VALUE: DUE_90',
      'o', pg_temp.run(mgr, format('select bucket from public.v_renewal_pipeline where id = %L', k1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Change the value of an ACTIVE contract', 'e', 'REJECTED',
      'o', pg_temp.run(mgr, format('update public.contracts set annual_value_eur = 1 where id = %L', k1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Delete a contract', 'e', 'REJECTED',
      'o', pg_temp.run(mgr, format('delete from public.contracts where id = %L', k1)));
    r := r || jsonb_build_object('w', 'coordinator', 't', 'Coordinator edits a contract (hidden by RLS)', 'e', 'OK: 0 rows',
      'o', pg_temp.run(coord, format('update public.contracts set notes = %L where id = %L', 'x', k1)));

    -- ---------------- visit planning (coordinator) ----------------
    r := r || jsonb_build_object('w', 'coordinator', 't', 'Coordinator assigns visit 1 to Tech A, visit 2 to Tech B', 'e', 'OK: 2 rows',
      'o', pg_temp.run(coord, format(
        'update public.preventive_visits set assigned_technician_id = case visit_number when 1 then %L::uuid else %L::uuid end where contract_id = %L',
        techa, techb, k1)));

    -- ---------------- service requests, coverage and SLA ----------------
    r := r || jsonb_build_object('w', 'coordinator', 't', 'Create P1 ticket on a covered unit (6 h ago, Tech A)', 'e', 'OK: 1 rows',
      'o', pg_temp.run(coord, format(
        'insert into public.service_requests (id, equipment_id, reported_at, priority, description, assigned_technician_id) values (%L, %L, now() - interval ''6 hours'', ''P1'', ''Server room too warm'', %L)',
        t1, e1, techa)));
    r := r || jsonb_build_object('w', 'admin', 't', 'Database assigned the covering contract and P1 SLA (4 h)', 'e', 'VALUE: T2-K1 / 4',
      'o', pg_temp.run('admin', format(
        'select covering_contract_number || '' / '' || sla_hours from public.v_service_requests where id = %L', t1)));
    r := r || jsonb_build_object('w', 'coordinator', 't', 'Create ticket on a unit without contract (Tech B)', 'e', 'OK: 1 rows',
      'o', pg_temp.run(coord, format(
        'insert into public.service_requests (id, equipment_id, priority, description, assigned_technician_id) values (%L, %L, ''P2'', ''Noise'', %L)',
        t2, e2, techb)));
    r := r || jsonb_build_object('w', 'admin', 't', 'Ticket without contract is billable, no SLA', 'e', 'VALUE: true / NO_SLA',
      'o', pg_temp.run('admin', format(
        'select is_billable || '' / '' || sla_status from public.v_service_requests where id = %L', t2)));

    -- ---------------- technician: only their own work ----------------
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A records first response after 3 h', 'e', 'OK: 1 rows',
      'o', pg_temp.run(techa, format(
        'update public.service_requests set first_response_at = reported_at + interval ''3 hours'' where id = %L', t1)));
    r := r || jsonb_build_object('w', 'admin', 't', 'SLA evaluated: 3 h <= 4 h', 'e', 'VALUE: MET',
      'o', pg_temp.run('admin', format('select sla_status from public.v_service_requests where id = %L', t1)));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A sees only own visits', 'e', 'VALUE: 1',
      'o', pg_temp.run(techa, 'select count(*) from public.v_preventive_visits'));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A sees only own tickets', 'e', 'VALUE: 1',
      'o', pg_temp.run(techa, 'select count(*) from public.v_service_requests'));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A updates Tech B''s ticket (hidden by RLS)', 'e', 'OK: 0 rows',
      'o', pg_temp.run(techa, format('update public.service_requests set resolution_notes = ''x'' where id = %L', t2)));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A updates Tech B''s visit (hidden by RLS)', 'e', 'OK: 0 rows',
      'o', pg_temp.run(techa, format('update public.preventive_visits set observations = ''x'' where contract_id = %L and visit_number = 2', k1)));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A reassigns own ticket to Tech B', 'e', 'REJECTED',
      'o', pg_temp.run(techa, format('update public.service_requests set assigned_technician_id = %L where id = %L', techb, t1)));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A changes the due date of own visit', 'e', 'REJECTED',
      'o', pg_temp.run(techa, format('update public.preventive_visits set due_date = due_date + 30 where contract_id = %L and visit_number = 1', k1)));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A completes own visit', 'e', 'OK: 1 rows',
      'o', pg_temp.run(techa, format(
        'update public.preventive_visits set status = ''DONE'', actual_date = private.today(), result = ''OK'' where contract_id = %L and visit_number = 1', k1)));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A sees only the contract behind own work', 'e', 'VALUE: 1',
      'o', pg_temp.run(techa, 'select count(*) from public.contracts'));
    r := r || jsonb_build_object('w', 'tech A', 't', 'Tech A reads the audit log', 'e', 'VALUE: 0',
      'o', pg_temp.run(techa, 'select count(*) from public.audit_log'));

    -- ---------------- viewer, coordinator, anonymous ----------------
    r := r || jsonb_build_object('w', 'viewer', 't', 'Viewer reads all test contracts', 'e', 'VALUE: 4',
      'o', pg_temp.run(viewr, 'select count(*) from public.contracts where contract_number like ''T2-%'''));
    r := r || jsonb_build_object('w', 'viewer', 't', 'Viewer creates a customer', 'e', 'REJECTED',
      'o', pg_temp.run(viewr, 'insert into public.customers (name, segment) values (''Viewer Test'', ''OFFICE'')'));
    r := r || jsonb_build_object('w', 'coordinator', 't', 'Coordinator creates a customer', 'e', 'OK: 1 rows',
      'o', pg_temp.run(coord, 'insert into public.customers (name, segment) values (''Coordinator Test'', ''OFFICE'')'));
    r := r || jsonb_build_object('w', 'anonymous', 't', 'Anonymous visitor reads customers', 'e', 'REJECTED',
      'o', pg_temp.run('anon', 'select count(*) from public.customers'));

    -- ---------------- renewal ----------------
    r := r || jsonb_build_object('w', 'coordinator', 't', 'Coordinator renews a contract', 'e', 'REJECTED',
      'o', pg_temp.run(coord, format('select public.renew_contract(%L)', k1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Manager renews: new version T2-K1-R1', 'e', 'VALUE: T2-K1-R1',
      'o', pg_temp.run(mgr, format('select (public.renew_contract(%L)).contract_number', k1)));
    r := r || jsonb_build_object('w', 'admin', 't', 'Old -> RENEWED; new ACTIVE with 1 unit and 2 visits', 'e', 'VALUE: RENEWED / ACTIVE / 1 / 2',
      'o', pg_temp.run('admin', format(
        'select o.status || '' / '' || n.status || '' / '' || (select count(*) from public.contract_equipment where contract_id = n.id) || '' / '' || (select count(*) from public.preventive_visits where contract_id = n.id) from public.contracts o join public.contracts n on n.previous_contract_id = o.id where o.id = %L', k1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Renew the same contract twice', 'e', 'REJECTED',
      'o', pg_temp.run(mgr, format('select public.renew_contract(%L)', k1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Set a RENEWED contract back to ACTIVE', 'e', 'REJECTED',
      'o', pg_temp.run(mgr, format('update public.contracts set status = ''ACTIVE'' where id = %L', k1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Terminate without a reason', 'e', 'REJECTED',
      'o', pg_temp.run(mgr, format('select public.terminate_contract((select id from public.contracts where previous_contract_id = %L), private.today() + 100, '' '')', k1)));
    r := r || jsonb_build_object('w', 'admin', 't', 'Audit log: activation and renewal of K1 recorded with the manager', 'e', 'VALUE: 2',
      'o', pg_temp.run('admin', format(
        'select count(*) from public.audit_log where record_id = %L and changed_by = %L', k1, mgr)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Manager edits the audit log', 'e', 'REJECTED',
      'o', pg_temp.run(mgr, 'delete from public.audit_log'));

    -- ---------------- overlapping coverage ----------------
    r := r || jsonb_build_object('w', 'manager', 't', 'Draft contract K3 overlapping the renewed version', 'e', 'OK: 1 rows',
      'o', pg_temp.run(mgr, format(
        'insert into public.contracts (id, contract_number, customer_id, contract_type, start_date, end_date, annual_value_eur, sla_p1_hours, sla_p2_hours, sla_p3_hours) values (%L, ''T2-K3'', ''eeeeeeee-0000-0000-0000-000000000001'', ''ON_CALL'', private.today() + 200, private.today() + 400, 500, 8, 24, 48)', k3)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Add the same unit to the draft', 'e', 'OK: 1 rows',
      'o', pg_temp.run(mgr, format('insert into public.contract_equipment (contract_id, equipment_id) values (%L, %L)', k3, e1)));
    r := r || jsonb_build_object('w', 'manager', 't', 'Activate the overlapping draft', 'e', 'REJECTED',
      'o', pg_temp.run(mgr, format('select public.activate_contract(%L)', k3)));

    -- ---------------- daily expiry job ----------------
    r := r || jsonb_build_object('w', 'admin', 't', 'Expiry job: 2 contracts ended yesterday', 'e', 'VALUE: 2',
      'o', pg_temp.run('admin', 'select public.expire_contracts()'));
    r := r || jsonb_build_object('w', 'admin', 't', 'Without auto-renew -> EXPIRED; with auto-renew -> RENEWED', 'e', 'VALUE: EXPIRED / RENEWED',
      'o', pg_temp.run('admin',
        'select (select status::text from public.contracts where contract_number = ''T2-K4'') || '' / '' || (select status::text from public.contracts where contract_number = ''T2-K5'')'));

    -- ---------------- availability ----------------
    perform pg_temp.run('admin', format(
      'update public.service_requests set failure_start = now() - interval ''216 hours'', failure_end = now() where id = %L', t2));
    r := r || jsonb_build_object('w', 'admin', 't', 'Unit down 216 h in 90 days -> availability 0.9', 'e', 'VALUE: 0.9000',
      'o', pg_temp.run('admin', format(
        'select availability_90d from public.v_equipment_availability where equipment_id = %L', e2)));

    raise exception 'rollback test data' using errcode = 'U0001';
  exception when sqlstate 'U0001' then
    null;
  end;

  return query
    select x.ord, x.item->>'w', x.item->>'t', x.item->>'e',
           case when x.item->>'o' like (x.item->>'e') || '%' then 'PASS' else 'FAIL' end,
           x.item->>'o'
    from jsonb_array_elements(r) with ordinality as x(item, ord)
    order by x.ord;
end;
$$;

select * from pg_temp.run_checks();
