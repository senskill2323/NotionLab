-- Tables
select table_name, table_type
from information_schema.tables
where table_schema='public'
order by table_name;

-- Colonnes & types
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public'
order by table_name, ordinal_position;

-- Index
select t.relname as table_name, i.relname as index_name, pg_get_indexdef(ix.indexrelid) as definition
from pg_class t
join pg_namespace n on n.oid = t.relnamespace and n.nspname='public'
join pg_index ix on t.oid = ix.indrelid
join pg_class i on i.oid = ix.indexrelid
where t.relkind='r'
order by t.relname, i.relname;

-- Policies RLS
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;

-- Fonctions (RPC)
select routine_name, data_type as returns
from information_schema.routines
where specific_schema='public'
order by routine_name;
