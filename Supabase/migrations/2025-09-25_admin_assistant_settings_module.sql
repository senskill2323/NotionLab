BEGIN;

DO 
DECLARE perm TEXT;
DECLARE next_row INTEGER;
BEGIN
  SELECT permission_required INTO perm
  FROM public.admin_dashboard_tabs
  WHERE tab_id = 'ai_assistant' OR label = 'Assistant IA'
  LIMIT 1;

  IF perm IS NULL THEN
    perm := 'admin';
  END IF;

  SELECT COALESCE(MAX(row_order), 0) + 1 INTO next_row FROM public.admin_dashboard_tabs;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_dashboard_tabs WHERE tab_id = 'ai_assistant'
  ) THEN
    INSERT INTO public.admin_dashboard_tabs (tab_id, label, icon, row_order, col_order, permission_required)
    VALUES ('ai_assistant', 'Assistant IA', 'Bot', next_row, 1, perm);
  END IF;
END ;

INSERT INTO public.admin_modules_registry (module_key, tab_id, component_name, label, description, icon, display_order, is_active, updated_at)
VALUES (
  'admin_assistant_settings',
  'ai_assistant',
  'AssistantSettingsPanel',
  'Paramétrage Assistant IA',
  'Configurer le comportement de l''assistant temps réel.',
  'Bot',
  1,
  TRUE,
  NOW()
)
ON CONFLICT (module_key) DO UPDATE
  SET tab_id = EXCLUDED.tab_id,
      component_name = EXCLUDED.component_name,
      label = EXCLUDED.label,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      display_order = EXCLUDED.display_order,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();

COMMIT;
