-- Ajouter le module Homepage pour l'espace client
-- Ce module permet d'afficher un aperçu des blocs de la page d'accueil dans l'espace client

-- ÉTAPE 0: Définir la permission requise dans role_permissions (FK de modules_registry.required_permission)
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
  'homepage:view_module',
  'Affiche le module "Homepage" sur le tableau de bord client.',
  'Modules Clients',
  true,
  false,
  false,
  false,
  false,
  2,
  NOW()
) ON CONFLICT (permission) DO UPDATE SET
  description   = EXCLUDED.description,
  family        = EXCLUDED.family,
  client        = EXCLUDED.client,
  display_order = EXCLUDED.display_order;

-- ÉTAPE 1: Ajouter le module Homepage directement dans modules_registry
INSERT INTO modules_registry (
  module_key,
  name,
  description,
  required_permission,
  is_active,
  default_layout,
  created_at
) VALUES (
  'client_homepage',
  'Aperçu Homepage',
  'Affiche un aperçu des blocs configurés pour la page d''accueil du site',
  'homepage:view_module',
  true,
  '{"span": 12, "order": 1}'::jsonb,
  NOW()
) ON CONFLICT (module_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required_permission = EXCLUDED.required_permission,
  is_active = EXCLUDED.is_active,
  default_layout = EXCLUDED.default_layout;

-- Optionnel: Créer une disposition par défaut pour inclure le module Homepage
-- Ceci créera automatiquement un layout avec le module Homepage pour les nouveaux utilisateurs
INSERT INTO dashboard_layouts (
  owner_type,
  owner_id,
  layout_json,
  created_at
) VALUES (
  'default',
  null,
  '{
    "rows": [
      {
        "rowId": "homepage-row",
        "columns": [
          {
            "colId": "homepage-col",
            "moduleKey": "client_homepage",
            "span": 12
          }
        ]
      }
    ]
  }'::jsonb,
  NOW()
) ON CONFLICT (owner_type, owner_id) DO UPDATE SET
  layout_json = EXCLUDED.layout_json,
  updated_at = NOW();
