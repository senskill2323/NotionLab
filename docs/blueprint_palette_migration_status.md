# Blueprint Palette – État des migrations

## Étapes déjà effectuées ok
- Création des tables `public.blueprint_palette_families` et `public.blueprint_palette_items` avec index, triggers `set_updated_at`, RLS et droits (`Supabase/migrations/2025-10-20_blueprint_palette_catalog.sql`).
- Seed initial de trois familles et six items représentatifs (`Supabase/migrations/2025-10-20_blueprint_palette_seed.sql`).
- Ajout des RPC Supabase :
  - `get_blueprint_palette_catalog` (lecture hiérarchique familles → items actifs)
  - `upsert_blueprint_palette_family` / `delete_blueprint_palette_family`
  - `upsert_blueprint_palette_item` / `delete_blueprint_palette_item`
  sécurisées via `public.is_owner_or_admin` (`Supabase/migrations/2025-10-20_blueprint_palette_api.sql`).
- Vérification des seeds via `node scripts/run-sql.js` montrant familles et items insérés.
- Couche client étendue (`src/lib/blueprints/blueprintApi.js`) avec les helpers `fetchBlueprintPalette`, `upsertPaletteFamily`, `deletePaletteFamily`, `upsertPaletteItem`, `deletePaletteItem`.
- Hook builder mis à jour (`src/hooks/useBlueprintBuilder.js`) :
  - Import `getDefaultBlueprintPalette` et `fetchBlueprintPalette`.
  - État `palette`, initialisé au fallback statique.
  - `useEffect` de chargement Supabase avec fallback sur la constante en cas d’erreur.
  - Exposition de `palette` via `state` du hook.
- `BlueprintBuilderPage.jsx` consomme désormais `state.palette` (fallback statique conservé) pour alimenter `<BlueprintPalette>`.
- `BlueprintPalette.jsx` s'appuie sur familles/items simples (sans sous-familles), conserve le drag & drop et l'affichage label + description.
- `BlueprintPaletteAdminPage.jsx` (Admin) permet CRUD familles/blocs avec toasts et formulaires reliés aux RPC Supabase.

## Points clés à retenir
- Les policies RLS reposent sur `public.is_owner_or_admin`; les appels RPC client doivent être effectués par un rôle owner/admin pour les opérations d’écriture.
- `fetchBlueprintPalette` renvoie déjà des structures prêtes à consommer (`[{ id, label, description, items: [...] }]`).
- Tant que l’UI builder ne consomme pas cette nouvelle donnée, le fallback statique assure la continuité (aucune régression attendue).
- Prochaines étapes majeures :
  1. Tester manuellement le module admin et la création de blocs côté builder.
  2. Étendre la documentation (`rules/07-Fonctionnalités/Builder de Notion`) avec la procédure module admin.
  3. Prévoir (si besoin) une instrumentation ou analytics sur l’usage des blocs dynamiques.
