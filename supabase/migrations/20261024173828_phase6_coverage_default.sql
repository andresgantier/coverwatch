-- contract_equipment.coverage is always filled from the contract by a trigger.
-- A default lets the app insert just (contract_id, equipment_id).
alter table public.contract_equipment alter column coverage set default 'empty'::daterange;
