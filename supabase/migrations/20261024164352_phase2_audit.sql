-- Phase 2c: audit trail. Every change to contracts and service requests is logged
-- with who made it, when, and the before/after values of the changed fields.

create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_id uuid;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_id := new.id;
  elsif tg_op = 'UPDATE' then
    -- Keep only the fields that actually changed.
    select jsonb_object_agg(n.key, o.value), jsonb_object_agg(n.key, n.value)
      into v_old, v_new
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key <> 'updated_at';

    if v_new is null then
      return null; -- nothing changed
    end if;
    v_id := new.id;
  else
    v_old := to_jsonb(old);
    v_id := old.id;
  end if;

  insert into public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
  values (tg_table_name, v_id, tg_op, auth.uid(), v_old, v_new);
  return null;
end;
$$;

create trigger contracts_audit
after insert or update or delete on public.contracts
for each row execute function private.audit_row();

create trigger service_requests_audit
after insert or update or delete on public.service_requests
for each row execute function private.audit_row();

revoke execute on function private.audit_row() from public;

-- The log is append-only for everyone using the app.
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
