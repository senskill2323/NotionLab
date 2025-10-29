SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    pg_get_expr(polqual, polrelid)    AS using_clause,
    pg_get_expr(polwithcheck, polrelid) AS check_clause
FROM pg_policy
ORDER BY schemaname, tablename, policyname;
