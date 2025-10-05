Objectif
- SI c'est une analyse que je te demande, produit des analyses/diagnostics fiables avec lecture minimale et ciblée de /rules. N’ouvre PAS tout: Lis l'index (présent ci-dessous), et sélectionne uniquement les entrées pertinentes à la question/analyse/diagnostique/requête, puis lis seulement ces fichiers qui peuvent t'aider à comprendre. Pour plus d'informations, lance une requête pour chercher plus d'informations.

Lis toujours /rules/01-standards/readme.mdc avant de faire une action. lis toujours les autres parties de /rules avant chaque action, mais seulement ce qui est relatif à l'action que tu vas réalisé, en te servant de l'index ci-dessous: 


Index du dossier /rules: 

## Vue d'ensemble
- `00-architecture/` : Cartographie du shell React/Vite, des providers globaux et des flux Supabase clés.
- `01-standards/` : Stack de référence, pratiques CI/CD, scripts SQL et règles de modification.
- `03-frameworks-and-libraries/` : Inventaire des dépendances production et développement synchronisé avec `package.json`.
- `04-database/` : Placeholder pour la nomenclature SQL et les politiques RLS.
- `06-deployment/` : Checklists opérationnelles pour publier de nouveaux modules client et admin.
- `07-Fonctionnalités/` : Guides fonctionnels détaillant chaque module du produit.

## Dossiers et fichiers

### 00-architecture
- `00-architecture/readme.mdc` : Cartographie complète du shell SPA (providers, routing, flux métiers, intégrations Supabase).
- `00-architecture/Espace administrateur` : Synthèse dédiée au dashboard admin (routing dynamique, dépendances Supabase, contextes UI).

### 01-standards
- `01-standards/readme.mdc` : Stack de référence, pratiques CI/CD, scripts SQL et règle de lecture préalable avant modification.

### 03-frameworks-and-libraries
- `03-frameworks-and-libraries/readme.mdc` : Inventaire exhaustif des dépendances production et développement.

### 04-database
- `04-database/readme.mdc` : Placeholder destiné à la nomenclature SQL et aux politiques RLS (à compléter).

### 06-deployment
- `06-deployment/Déployer un nouveau module client` : Checklist permissions `*:view_module`, enregistrement `modules_registry`, layout par défaut et intégration React côté client/builder.
- `06-deployment/Déployer un nouveau module admin` : Procédure alignant permissions, onglets admin, `admin_modules_registry` et composants React du dashboard d'administration.

### 07-Fonctionnalités
- `07-Fonctionnalités/Assistant IA` : Fonctionnement de l'assistant WebRTC (`useAssistant`, quotas, métriques Supabase, edge `assistant-mint-key`).
- `07-Fonctionnalités/Builder de formation` : Architecture du builder React Flow, catalogue `BuilderCatalogContext`, flux Supabase et exigences de sécurité.
- `07-Fonctionnalités/Builder de Notion` : Blueprint du builder (ReactFlow + Supabase), autosave/undo, RPC de snapshot/partage et sécurisation des tokens.
- `07-Fonctionnalités/Formation` : Panorama des formations (catalogue public, builder, admin), usages Supabase et lacunes RLS/RPC à traiter.
- `07-Fonctionnalités/Gestion des bloques` : Cycle de vie `content_blocks`, edge `manage-content-block`, RPC de statut/ordre et bibliothèque de modèles.
- `07-Fonctionnalités/Gestion des tickets` : Diagnostic du module tickets client/admin, flux Supabase direct/realtime et risques RLS.
- `07-Fonctionnalités/Gestion des utilisateurs` : Workflow invitation/suppression (`invite-user`, `admin_delete_user_full`), contextes Auth/Permissions et UI admin/client.
- `07-Fonctionnalités/Module d'invitation` : Notes d'intégration de l'edge `invite-user`, synchronisation des permissions et expérience d'activation.
- `07-Fonctionnalités/Module de thèmes` : Gestion `ThemeProvider`/`ThemePanel`, CRUD Supabase des tokens et prévisualisation dynamique.
- `07-Fonctionnalités/Suppression d'un compte` : Rappel d'usage exclusif de `supabase.rpc('admin_delete_user_full')` et périmètre de purge.
