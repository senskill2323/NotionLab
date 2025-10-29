SELECT
  p.polname AS policy_name,
  p.polcmd  AS cmd,
  pg_get_expr(p.polqual,      p.polrelid) AS using_clause,
  pg_get_expr(p.polwithcheck, p.polrelid) AS check_clause
FROM pg_policy p
JOIN pg_class c      ON c.oid = p.polrelid
JOIN pg_namespace n  ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname  = 'email_notifications'
ORDER BY policy_name;
