Objectif
- SI c'est une analyse que je te demande, produit des analyses/diagnostics fiables avec lecture minimale et ciblée de /rules. N’ouvre PAS tout: Lis l'index (présent ci-dessous), et sélectionne uniquement les entrées pertinentes à la question/analyse/diagnostique/requête, puis lis seulement ces fichiers qui peuvent t'aider à comprendre. Pour plus d'informations, lance une requête pour chercher plus d'informations.

Méthode si je te demande une analyse/diagnostic: 
1) Ouvre /rules/_index.* ; liste les entrées pertinentes ; lis SEULEMENT celles utiles.
2) Si doute → formuler 3–5 hypothèses + questions ciblées ; sinon procéder.
3) Résultat: Résumé (≤8 lignes) → Plan d’action → Preuves (fichiers/sections) → Limites.


Général: 

Outils
- PowerShell 7: "C:\Program Files\PowerShell\7\pwsh.exe"
- SQL: node scripts/run-sql.js "<SQL>"
- Interdit: service-role en client; .env.local diffusé hors dev.

Sécurité & Encodage
- UTF-8 strict (sans BOM). Préserver les accents, aucun échappement ASCII.
- Échouer si VITE_SUPABASE_URL/ANON_KEY manquants ; alerter clairement.
- ID projet Supabase: kiudpvvqpbkzeybogrnq (NotionLab).

Garde-fous
- Lecture /rules: max 5 fichiers par passe puis synthèse.
- SQL “write”: exiger CONFIRM_WRITE=1 sinon ABORT.
- Avant sortie: auto-check (cohérence, sécurité, encodage, sources citées).



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
rules/Fonctionnalités/Suppression d'un compte –
rules/Fonctionnalités/Builder de formation – 
rules/Fonctionnalités/Builder de Notion - 