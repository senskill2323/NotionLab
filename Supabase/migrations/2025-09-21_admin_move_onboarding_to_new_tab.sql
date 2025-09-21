-- Migration: Move OnboardingQuestionsAdminPanel to a new Admin tab 'Préférences-form'
-- Date: 2025-09-21
-- This migration creates a new admin tab and assigns the OnboardingQuestionsAdminPanel module to it.
-- It removes the module from its previous tab (e.g. Formation Live) by updating its tab_id.

BEGIN;

-- 1) Ensure the new tab exists with a safe permission and ordering
DO $$
DECLARE perm TEXT;
DECLARE next_row INTEGER;
BEGIN
  -- Try to reuse the same permission as the 'Formation Live' tab if present, otherwise default to 'admin'
  SELECT permission_required INTO perm
  FROM public.admin_dashboard_tabs
  WHERE label = 'Formation Live'
  LIMIT 1;

  IF perm IS NULL THEN
    perm := 'admin';
  END IF;

  SELECT COALESCE(MAX(row_order), 0) + 1 INTO next_row FROM public.admin_dashboard_tabs;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_dashboard_tabs WHERE tab_id = 'preferences_form'
  ) THEN
    INSERT INTO public.admin_dashboard_tabs (tab_id, label, icon, row_order, col_order, permission_required)
    VALUES ('preferences_form', 'Préférences-form', 'Sliders', next_row, 1, perm);
  END IF;
END $$;

-- 2) Move (or create) the module mapping for OnboardingQuestionsAdminPanel into the new tab
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.admin_modules_registry WHERE component_name = 'OnboardingQuestionsAdminPanel'
  ) THEN
    UPDATE public.admin_modules_registry
    SET tab_id = 'preferences_form', display_order = 1, is_active = TRUE
    WHERE component_name = 'OnboardingQuestionsAdminPanel';
  ELSE
    -- If no mapping existed yet, create it now
    INSERT INTO public.admin_modules_registry (module_key, tab_id, component_name, display_order, is_active)
    VALUES ('onboarding_preferences_form', 'preferences_form', 'OnboardingQuestionsAdminPanel', 1, TRUE);
  END IF;
END $$;

COMMIT;
