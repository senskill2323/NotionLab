-- Add admin permission for Assistant settings and bind dashboard tab
BEGIN;

INSERT INTO public.role_permissions (
  permission,
  description,
  client,
  vip,
  admin,
  prof,
  guest,
  family,
  display_order
) VALUES (
  'admin:manage_assistant_settings',
  'Acces au module "Parametrage Assistant IA" dans l''admin.',
  false,
  false,
  true,
  false,
  false,
  'admin',
  210
) ON CONFLICT (permission) DO UPDATE SET
  description = EXCLUDED.description,
  client = EXCLUDED.client,
  vip = EXCLUDED.vip,
  admin = EXCLUDED.admin,
  prof = EXCLUDED.prof,
  guest = EXCLUDED.guest,
  family = COALESCE(EXCLUDED.family, role_permissions.family),
  display_order = COALESCE(EXCLUDED.display_order, role_permissions.display_order);

UPDATE public.admin_dashboard_tabs
SET permission_required = 'admin:manage_assistant_settings'
WHERE tab_id = 'ai_assistant';

COMMIT;