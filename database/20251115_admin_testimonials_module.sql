-- Module Admin: Gestion des témoignages
-- Ce script ajoute l'onglet et le module Testimonials dans le dashboard admin,
-- ainsi que les permissions nécessaires pour contrôler l'accès et les actions.

-- Étape 0 : Permissions dédiées au module
INSERT INTO role_permissions (
  permission,
  description,
  family,
  client,
  prof,
  guest,
  admin,
  vip,
  display_order,
  created_at
) VALUES (
  'admin:testimonials:view_module',
  'Accéder au module "Testimonials" dans le tableau de bord administrateur.',
  'Modules Admin',
  false,
  false,
  false,
  true,
  false,
  120,
  NOW()
) ON CONFLICT (permission) DO UPDATE SET
  description   = EXCLUDED.description,
  family        = EXCLUDED.family,
  client        = EXCLUDED.client,
  prof          = EXCLUDED.prof,
  guest         = EXCLUDED.guest,
  admin         = EXCLUDED.admin,
  vip           = EXCLUDED.vip,
  display_order = EXCLUDED.display_order;

INSERT INTO role_permissions (
  permission,
  description,
  family,
  client,
  prof,
  guest,
  admin,
  vip,
  display_order,
  created_at
) VALUES (
  'admin:testimonials:update',
  'Modifier le contenu, la note ou la visibilité d’un témoignage.',
  'Modules Admin',
  false,
  false,
  false,
  true,
  false,
  121,
  NOW()
) ON CONFLICT (permission) DO UPDATE SET
  description   = EXCLUDED.description,
  family        = EXCLUDED.family,
  client        = EXCLUDED.client,
  prof          = EXCLUDED.prof,
  guest         = EXCLUDED.guest,
  admin         = EXCLUDED.admin,
  vip           = EXCLUDED.vip,
  display_order = EXCLUDED.display_order;

INSERT INTO role_permissions (
  permission,
  description,
  family,
  client,
  prof,
  guest,
  admin,
  vip,
  display_order,
  created_at
) VALUES (
  'admin:testimonials:delete',
  'Supprimer un témoignage de la plateforme.',
  'Modules Admin',
  false,
  false,
  false,
  true,
  false,
  122,
  NOW()
) ON CONFLICT (permission) DO UPDATE SET
  description   = EXCLUDED.description,
  family        = EXCLUDED.family,
  client        = EXCLUDED.client,
  prof          = EXCLUDED.prof,
  guest         = EXCLUDED.guest,
  admin         = EXCLUDED.admin,
  vip           = EXCLUDED.vip,
  display_order = EXCLUDED.display_order;

-- Étape 1 : Onglet Testimonials dans le dashboard admin
INSERT INTO admin_dashboard_tabs (
  tab_id,
  label,
  icon,
  row_order,
  col_order,
  permission_required
) VALUES (
  'testimonials',
  'Testimonials',
  'MessageSquare',
  1,
  0,
  'admin:testimonials:view_module'
) ON CONFLICT (tab_id) DO UPDATE SET
  label                = EXCLUDED.label,
  icon                 = EXCLUDED.icon,
  row_order            = EXCLUDED.row_order,
  col_order            = EXCLUDED.col_order,
  permission_required  = EXCLUDED.permission_required;

-- Étape 2 : Module Testimonials associé à l’onglet
INSERT INTO admin_modules_registry (
  module_key,
  tab_id,
  component_name,
  label,
  icon,
  display_order,
  is_active
) VALUES (
  'admin_testimonials_module',
  'testimonials',
  'TestimonialsManagementPanel',
  'Testimonials',
  'MessageSquare',
  0,
  true
) ON CONFLICT (module_key) DO UPDATE SET
  tab_id         = EXCLUDED.tab_id,
  component_name = EXCLUDED.component_name,
  label          = EXCLUDED.label,
  icon           = EXCLUDED.icon,
  display_order  = EXCLUDED.display_order,
  is_active      = EXCLUDED.is_active;
