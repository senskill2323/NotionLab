Objectif
- SI c'est une analyse que je te demande, produit des analyses/diagnostics fiables avec lecture minimale et ciblée de /rules. N’ouvre PAS tout: Lis l'index (présent ci-dessous), et sélectionne uniquement les entrées pertinentes à la question/analyse/diagnostique/requête, puis lis seulement ces fichiers qui peuvent t'aider à comprendre. Pour plus d'informations, lance une requête pour chercher plus d'informations.

Lis toujours /rules/01-standards/readme.mdc avant de faire une action. lis toujours les autres parties de /rules avant chaque action, mais seulement ce qui est relatif à l'action que tu vas réalisé, en te servant de l'index ci-dessous: 


Index du dossier /rules: 


## Vue d'ensemble
- `00-architecture/` : Cartographie du shell React/Vite, des providers globaux et des parcours admin/client.
- `01-standards/` : Stack de référence, pratiques CI/CD, scripts SQL et règles de modification.
- `03-frameworks-and-libraries/` : Inventaire des dépendances de production et de développement synchronisé avec `package.json`.
- `04-database/` : Placeholder pour la nomenclature SQL et les politiques RLS (à compléter).
- `06-deployment/` : Checklists opérationnelles pour publier de nouveaux modules client et admin.
- `07-Fonctionnalités/` : Guides fonctionnels détaillant chaque module clé du produit.

## Dossiers et fichiers

### 00-architecture
- `00-architecture/readme.mdc` : Cartographie complète du shell SPA (providers, routing, flux Supabase, builders).
- `00-architecture/Espace administrateur` : Synthèse de l'espace admin (onglets dynamiques, permissions, dépendances Supabase).

### 01-standards
- `01-standards/readme.mdc` : Stack de référence, scripts npm/SQL, règles de lecture préalable et bonnes pratiques CI/CD.

### 03-frameworks-and-libraries
- `03-frameworks-and-libraries/readme.mdc` : Inventaire exhaustif des dépendances production et développement alignées sur `package.json`.

### 04-database
- `04-database/readme.mdc` : Placeholder vide à compléter pour la nomenclature SQL et les politiques RLS.

### 06-deployment
- `06-deployment/Déployer un nouveau module client` : Permission `*:view_module`, enregistrement `modules_registry`, layout par défaut et intégration React côté client/builder.
- `06-deployment/Déployer un nouveau module admin` : Liaison permissions `admin:*`, onglets `admin_dashboard_tabs`, `admin_modules_registry` et composant React du dashboard admin.

### 07-Fonctionnalités
- `07-Fonctionnalités/Assistant IA` : Assistant WebRTC (`useAssistant`, quotas, métriques Supabase, Edge `assistant-mint-key`).
- `07-Fonctionnalités/Blueprint Notion` : Blueprint builder React Flow (autosave, RPC Supabase, partage public, palette admin).
- `07-Fonctionnalités/Builder de formation` : Formation builder React Flow, catalogue `BuilderCatalogContext`, autosave et workflows admin/client.
- `07-Fonctionnalités/Formation` : Panorama catalogue formations, builder, dashboards client/admin et lacunes RLS/RPC.
- `07-Fonctionnalités/Gestion des bloques` : Cycle de vie `content_blocks`, Edge `manage-content-block`, bibliothèque de layouts et anomalies connues.
- `07-Fonctionnalités/Gestion des tickets` : Module tickets client/admin, flux Supabase direct/realtime et risques RLS critiques.
- `07-Fonctionnalités/Gestion des utilisateurs` : Invitation (`invite-user`), suppression (`admin_delete_user_full`), contextes Auth/Permissions et UI admin/client.
- `07-Fonctionnalités/Module d'invitation` : Workflow d'invitation via Edge `invite-user`, permissions et activation.
- `07-Fonctionnalités/Module de thèmes` : ThemeProvider/ThemePanel, CRUD Supabase des tokens, prévisualisation dynamique et garde RLS à renforcer.
- `07-Fonctionnalités/Preferences de formation` : Module onboarding training preferences, React Query, tables `training_onboarding_*` et Edge `notify-training-onboarding`.
- `07-Fonctionnalités/Suppression d'un compte` : Usage exclusif de `supabase.rpc('admin_delete_user_full')` pour la purge complète des comptes.
