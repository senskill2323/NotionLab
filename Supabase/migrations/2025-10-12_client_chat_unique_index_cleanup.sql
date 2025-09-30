-- Allow multiple chat conversations per guest by removing legacy unique constraints
-- and indexes on guest identifiers. The client flow relies on statuses to reuse
-- active threads; resolved conversations must not block new inserts.

-- Drop unique constraints that enforce a single row per guest_id or guest_email.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'u'
      AND conrelid = 'public.chat_conversations'::regclass
      AND (
        pg_get_constraintdef(oid) ILIKE '%guest_id%'
        OR pg_get_constraintdef(oid) ILIKE '%guest_email%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.chat_conversations DROP CONSTRAINT IF EXISTS %I;', r.conname);
  END LOOP;
END
$$;

-- Drop standalone unique indexes on the same columns if they still exist.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'chat_conversations'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND (
        indexdef ILIKE '%(guest_id)%'
        OR indexdef ILIKE '%(guest_email)%'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I;', r.indexname);
  END LOOP;
END
$$;
