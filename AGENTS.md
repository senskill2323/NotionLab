Objectif
- SI c'est une analyse que je te demande, produit des analyses/diagnostics fiables avec lecture minimale et ciblée des deux dossier de documntation:
1. C:\Users\yvallott\Desktop\rules VPS
2. C:\Users\yvallott\Desktop\rules site notionlab 

Mais attention, n’ouvre PAS tout!  Lis l'index ci-dessous, et sélectionne uniquement les entrées pertinentes à la question/analyse/diagnostique/requête, puis lis seulement ces fichiers qui peuvent t'aider à comprendre. Pour plus d'informations, lance une requête pour chercher plus d'informations.

Index du dossier /rules: 
# Index commun - Règles VPS & Site NotionLab

## Règles VPS (`C:\Users\yvallott\Desktop\rules VPS`)

- `rules VPS/index.md` — Index interne listant les fiches à consulter avant interventions sur le VPS.

### 00 - Général
- `rules VPS/00 - Général/readme.md` — Rappelle d'utiliser le fichier .codex/config.toml et l'outil MCP Ref avant d'implémenter des patterns incertains.
- `rules VPS/00 - Général/print Post-Mortem Auth & API.md` — Post-mortem Auth/GoTrue : prérequis Postgres, propriété supabase_auth_admin, corrections de migrations et politiques de privilèges.

### 01 - Architecture
- `rules VPS/01 - Architecture/readme.md` — Vue complète de la stack Docker Hostinger (Traefik, Kong, Supabase, N8n, Browserless, yt-dlp), réseaux, volumes persistants et points de sécurité clés.

### 02 - Services
- `rules VPS/02 - Services/docker` — Cartographie du docker-compose.yml, dépendances inter-services, volumes, flux réseau et exposition publique via Traefik/Kong.
- `rules VPS/02 - Services/Traefik` — Proxy host-mode, certificats ACME, routage SNI, sécurisation de Studio/Adminer et risques liés au montage du socket Docker.
- `rules VPS/02 - Services/Kong` — API gateway DB-less : routes /rest|/auth|/realtime|/graphql|/storage|/functions|/analytics|/pg, plugins key-auth/ACL, dépendances Logflare et secrets exposés.
- `rules VPS/02 - Services/Supabase` — Synthèse plateforme Supabase : Postgres/PostgREST/Realtime/Storage/Auth/Edge, intégrations OpenAI/N8n/Resend/Google Places, impacts sur schémas et RPC.
- `rules VPS/02 - Services/N8n` — Fiche automation : image Playwright custom, dépendance Browserless, webhooks mémoire/RAG, stockage Postgres et risques de secrets/docker.sock.
- `rules VPS/02 - Services/Site` — SPA publique NotionLab (React, Zustand, dnd-kit) servie par Nginx, intégration Supabase temps réel, absence de durcissement CSP.
- `rules VPS/02 - Services/yt-dlp` — API yt-dlp dédiée aux automatisations YouTube dans N8n.

### 03 - Functions
- `rules VPS/03 - Functions/readme.md` — Index détaillé des 25 Edge Functions (assistant, onboarding, N8n, notifications), dépendances externes et considérations de sécurité.

## Règles site NotionLab (`C:\Users\yvallott\Desktop\rules site notionlab`)

### 00-architecture
- `rules site notionlab/00-architecture/index.md` — Vue synthétique du dashboard client modulable, parcours formations, support intégré et dépendances Supabase/Edge pour chaque module.
- `rules site notionlab/00-architecture/readme.md` — Cartographie SPA React/Vite, contexts globaux (Auth, Permissions, Assistant), intégration Supabase et automatisations VPS.
- `rules site notionlab/00-architecture/fonctionnalités admin/fonctionnalités.md` — Tableau de bord admin dynamique, registres Supabase, Edge Functions sensibles et protections permissions/RLS.
- `rules site notionlab/00-architecture/fonctionnalités utilisateurs/fonctionnalités.md` — Placeholder vide pour le détail des fonctionnalités côté utilisateurs.

### 02-programming-languages
- `rules site notionlab/02-programming-languages/readme.md` — Bonnes pratiques de langages : React/TS côté client, Edge Functions Deno, SQL Supabase, alias Vite @/, exigences RLS.

### 03-frameworks-and-libraries
- `rules site notionlab/03-frameworks-and-libraries/readme.md` — Inventaire des dépendances UI/Data/Règles, providers globaux, cohérence RLS et zones d'incohérence notify-* manquantes.

### 04-database
- `rules site notionlab/04-database/readme.md` — Topologie Postgres Supabase, schémas public/content, fonctions search-embeddings/ai-docs, extensions et RPC exposés.

### 06-deployment
- `rules site notionlab/06-deployment/Deployer un module client.md` — Checklist permissions -> module React -> layout par défaut pour déployer un module client.
- `rules site notionlab/06-deployment/deployer un module admin.md` — Procédure pour cadrer, implémenter et enregistrer un module admin (migrations, admin_modules_registry, onglets Supabase).

### 07-quality-assurance
- `rules site notionlab/07-quality-assurance/readme.md` — Guide QA du module Formations : critères DoD, risques perf/RLS, workflows de validation et exigences assistant/onboarding.




**** IMPORTANT: 
je t'ai crée un clone des fonctions supabase car tu n'a pas accès au VPS. ELles sont dans C:\dev\notionlab\function-clone
Ne change rien à l'intérieur, ca ne sert à rien car c'est pas OFFICIEL. 