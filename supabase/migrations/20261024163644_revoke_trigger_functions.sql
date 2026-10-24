-- Trigger functions must not be callable through the API (/rest/v1/rpc/...).
-- Triggers keep working: EXECUTE is only checked when the trigger is created.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.contract_equipment_copy_contract() from public, anon, authenticated;
revoke execute on function public.contracts_sync_equipment_coverage() from public, anon, authenticated;
