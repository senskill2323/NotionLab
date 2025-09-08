-- Count tables per schema (excluding system schemas)
WITH t AS (
  SELECT table_schema,
         COUNT(*)::int AS tables
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema NOT IN ('pg_catalog','information_schema')
  GROUP BY table_schema
)
SELECT
  COALESCE(SUM(tables), 0)        AS total_user_tables,
  COALESCE(MAX(CASE WHEN table_schema = 'public' THEN tables END), 0) AS public_tables,
  JSON_AGG(JSON_BUILD_OBJECT('schema', table_schema, 'tables', tables) ORDER BY table_schema) AS per_schema
FROM t;
