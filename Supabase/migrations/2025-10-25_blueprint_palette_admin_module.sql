BEGIN;

INSERT INTO public.role_permissions (permission, description, family, client, vip, admin, prof, guest, display_order)
VALUES (
  'admin_blueprints:manage_palette',
  'Acces complet a la gestion de la palette Blueprint.',
  'Blueprints',
  FALSE,
  FALSE,
  TRUE,
  FALSE,
  FALSE,
  520
)
ON CONFLICT (permission) DO UPDATE
SET
  description = EXCLUDED.description,
  family = EXCLUDED.family,
  client = EXCLUDED.client,
  vip = EXCLUDED.vip,
  admin = EXCLUDED.admin,
  prof = EXCLUDED.prof,
  guest = EXCLUDED.guest,
  display_order = EXCLUDED.display_order;

DO $$
DECLARE
  next_row integer;
BEGIN
  SELECT COALESCE(MAX(row_order), 0) + 1 INTO next_row FROM public.admin_dashboard_tabs;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_dashboard_tabs WHERE tab_id = 'blueprints'
  ) THEN
    INSERT INTO public.admin_dashboard_tabs (tab_id, label, icon, row_order, col_order, permission_required)
    VALUES ('blueprints', 'Blueprints', 'Palette', next_row, 1, 'admin_blueprints:manage_palette');
  ELSE
    UPDATE public.admin_dashboard_tabs
    SET
      label = 'Blueprints',
      icon = 'Palette',
      permission_required = 'admin_blueprints:manage_palette'
    WHERE tab_id = 'blueprints';
  END IF;
END
$$;

INSERT INTO public.admin_modules_registry (module_key, tab_id, component_name, label, description, icon, display_order, is_active, updated_at)
VALUES (
  'admin_blueprint_palette',
  'blueprints',
  'BlueprintPaletteAdminPage',
  'Palette Blueprint',
  'Administrer la palette Blueprint.',
  'Palette',
  1,
  TRUE,
  now()
)
ON CONFLICT (module_key) DO UPDATE
SET
  tab_id = EXCLUDED.tab_id,
  component_name = EXCLUDED.component_name,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
