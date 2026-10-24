-- Exact row count of every table in the public schema, as "table|rows" lines.
select t.table_name,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text
from information_schema.tables t
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
order by t.table_name;
