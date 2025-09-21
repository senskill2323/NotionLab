-- Admin SELECT/UPDATE policies for formation_module_statuses so admins can manage users' Kanban
-- This preserves RLS and grants cross-user access only to admin roles.

-- Ensure table has RLS enabled (already done in previous migrations)
ALTER TABLE IF EXISTS public.formation_module_statuses ENABLE ROW LEVEL SECURITY;

-- Allow admins to SELECT all rows (required for Realtime to deliver events)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'formation_module_statuses' AND policyname = 'fms_select_admin'
  ) THEN
    CREATE POLICY fms_select_admin ON public.formation_module_statuses
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.user_types ut ON ut.id = p.user_type_id
          WHERE p.id = auth.uid()
            AND ut.type_name IN ('owner', 'admin')
        )
      );
  END IF;
END$$;

-- Allow admins to UPDATE all rows (so admin DnD persists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'formation_module_statuses' AND policyname = 'fms_update_admin'
  ) THEN
    CREATE POLICY fms_update_admin ON public.formation_module_statuses
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.user_types ut ON ut.id = p.user_type_id
          WHERE p.id = auth.uid()
            AND ut.type_name IN ('owner', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.user_types ut ON ut.id = p.user_type_id
          WHERE p.id = auth.uid()
            AND ut.type_name IN ('owner', 'admin')
        )
      );
  END IF;
END$$;
