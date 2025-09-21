-- Enable Supabase Realtime on Kanban statuses table (idempotent)
-- This ensures changes to public.formation_module_statuses are broadcast to clients

-- Ensure the publication exists (Supabase creates this by default, but make it idempotent)
DO $$
BEGIN
  BEGIN
    CREATE PUBLICATION supabase_realtime;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already exists
  END;
END$$;

-- Add the table to the publication only if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'formation_module_statuses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.formation_module_statuses;
  END IF;
END$$;
