-- Phase 1 verification: structure overview (tables, columns, constraints, indexes, RLS).
-- Run with: npx supabase db query --linked -f supabase/verification/phase1_structure.sql
select c.relname as table_name,
       (select count(*) from information_schema.columns col
         where col.table_schema = 'public' and col.table_name = c.relname) as columns,
       (select count(*) from pg_constraint k where k.conrelid = c.oid) as constraints,
       (select count(*) from pg_index i where i.indrelid = c.oid) as indexes,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
