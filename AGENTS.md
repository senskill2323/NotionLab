A chaque fois que je te demande une analyse, un diagnostique, commence par te renseigner dans les règles/docs, dans /rules.
N’ouvre PAS tout: Lis l'index ci-dessous, et sélectionne uniquement les entrées pertinentes à la question/analyse/diagnostique/requête, puis lis seulement ces fichiers qui peuvent t'aider à comprendre. Pour plus d'informations, lance une requête pour chercher plus d'informations. 

- Utilise, quand tu as besoin, powershell v7.xx ("C:\Program Files\PowerShell\7\pwsh.exe")
- Utilise le script Node scripts/run-sql.js (lancé comme node scripts/run-sql.js "<ta requête SQL>") pour exécuter des requêtes SQL contre Supabase.
- Ne jamais exposer SUPABASE_SERVICE_ROLE dans le code client et limiter la diffusion du fichier .env.local.
- Env via /.env & /.env.local (ex. VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) ; alerter si manquants ; ne jamais exposer de clés service-role côté client.
- ID du projet Supabase: kiudpvvqpbkzeybogrnq (Projet NotionLab)


- Index du dossier /rules: 

00-architecture

rules/00-architecture/readme.mdc – cartographie des modules client/admin, edge functions actives, tables RLS et grandes fonctionnalités (formations, assistant IA).

01-standards

rules/01-standards/readme.mdc – stack de référence (React/Vite/Supabase), outils UI/état, pratiques CI/CD, rappel d’usage de PowerShell et scripts SQL.

03-frameworks-and-libraries

rules/03-frameworks-and-libraries/readme.mdc – inventaire exhaustif des dépendances prod/dev aligné sur package.json.

04-database

rules/04-database/readme.mdc – placeholder vide (à compléter pour la nomenclature SQL/RLS).

06-deployment

rules/06-deployment/readme.mdc – placeholder vide (procédure de déploiement à documenter).

07-Fonctionnalités

rules/Fonctionnalités/Assistant IA – fonctionnement WebRTC, quotas, tables Supabase et conventions d’intégration du drawer.
rules/Fonctionnalités/Formation – pipeline parcours/Kanban, RPC et onboarding training.
rules/Fonctionnalités/Gestion des bloques – lifecycle des content_blocks, RPC associées et workflows admin.
rules/Fonctionnalités/Gestion des utilisateurs – déploiement et usage de admin_delete_user_full, intégrations UI, contrôles post-suppression.
rules/Fonctionnalités/Gestion des tickets – document vide (module à détailler).
rules/Fonctionnalités/Module d'invitation – document vide (processus d’invitation à ajouter).
rules/Fonctionnalités/Module de thèmes – document vide (gestion des thèmes à documenter).
rules/Fonctionnalités/Suppression d'un compte – document vide (probable doublon avec la section suppression dans “Gestion des utilisateurs”).
