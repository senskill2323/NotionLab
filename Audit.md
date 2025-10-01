# Audit Live Chat NotionLab

## 1. Architecture & Code
- Ecart: `ChatWidget.jsx` contourne `chatApi` pour fermer une conversation et inserer des messages en injectant un `senderName` derive du prenom (`src/components/ChatWidget.jsx:55`, `src/components/ChatWidget.jsx:225`, `src/components/ChatWidget.jsx:277`). Cela casse le calcul `has_unread` (les requetes staff attendent `sender='user'`) et aucune diffusion broadcast n'est envoyee.
  - Remediation: refactorer le widget pour reutiliser `chatApi.startClientConversation`, `chatApi.sendMessage|sendFile|sendResource` et `chatApi.archiveClientConversation`, puis supprimer la logique locale `supabase.channel('chat_*')`.
- Ecart: `AdminChatView.jsx` continue d'interagir directement avec `chat_messages` et n'emet que des `postgres_changes` (`src/components/admin/AdminChatView.jsx:120`, `src/components/admin/AdminChatView.jsx:143`, `src/components/admin/AdminChatView.jsx:178`). Les clients ne recoivent les messages admin que grace au fallback SQL et aucun broadcast n'est publie sur `chat-live-admin`.
  - Remediation: deleguer les envois et uploads a `chatApi.sendMessage|sendFile|sendResource`, brancher les listeners broadcast et retirer l'abonnement `postgres_changes` une fois les payloads completement hydratables.
- Ecart: `chatApi.getOrCreateConversation` recree un fil en inserant un `guest_id` aleatoire (`src/lib/chatApi.js:288-308`), hors du parcours RPC securise (`client_start_chat_conversation`), ce qui complique la mise en place de RLS.
  - Remediation: deprecier `getOrCreateConversation`, migrer les appels vers `chatApi.startClientConversation` (nouvelle signature `p_force_new`) et supprimer l'insert direct.

## 2. Base de donnees & RLS
- Ecart: les migrations live chat ajoutent des policies mais n'activent jamais `row level security` sur `public.chat_conversations` / `public.chat_messages` (`Supabase/migrations/2025-10-05_client_live_chat_module.sql`). Les updates directes `supabase.from(...).update` fonctionnent car RLS est off.
  - Remediation: `alter table ... enable row level security` sur les deux tables, declarer les policies client/staff/widget puis forcer le passage par des RPC (`client_mark_chat_viewed`, `admin_mark_chat_viewed`) pour mettre a jour `*_last_viewed_at`.
- Ecart: aucune policy ne limite l'insertion dans `public.chat_messages`; un utilisateur authentifie pourrait pousser un message dans n'importe quelle conversation.
  - Remediation: policies `INSERT` / `SELECT` dediees (owner du thread pour `sender='user'`, staff pour `sender in ('admin','owner','prof')`), plus contrainte `check (sender in ...)` pour verrouiller la valeur.

## 3. Realtime & Diffusion
- Ecart: `chatApi` ouvre ses canaux broadcast avec `ack: false` (`src/lib/chatApi.js:12`) alors que l'interface admin exige deja `ack: true` (`src/components/admin/AdminLiveChatPanel.jsx:189`). Les echecs d'envoi ne sont donc pas observes cote client.
  - Remediation: uniformiser `ack: true`, propager l'erreur sur les toasts et conserver `Promise.race` comme timeout.
- Ecart: `subscribeToClientChatMessages` declenche un `select` par message pour hydrater la ressource (`src/lib/chatApi.js:468-484`), puis ecoute en double via `postgres_changes`.
  - Remediation: une fois les surfaces broadcast refactorees, supprimer le fallback SQL et reposer sur le payload complet, avec des hydrations ponctuelles uniquement sur demande (ex: message resource).

## 4. UX & Etats UI
- Constat: les statuts metier (`ouvert`, `en_cours`, `a_traiter`, `resolu`, `abandonne`) sont exposes via `STATUS_CONFIG` (`src/pages/ChatPage.jsx:25-30`) et relies aux badges client/admin. Le widget n'honore pourtant pas ces etats lorsqu'il ferme la conversation (`src/components/ChatWidget.jsx:55`).
  - Remediation: reutiliser `chatApi.archiveClientConversation` et afficher la meme cartouche de meta dans le widget pour rester aligne avec la page principale.
- Constat: la colonne admin `admin_last_viewed_at` est maj via update direct (`src/components/admin/AdminLiveChatPanel.jsx:100`), sans feedback UI en cas d'echec.
  - Remediation: creer un RPC `admin_mark_chat_viewed` qui retourne l'horodatage final et mettre a jour le state via `chatApi.markConversationViewedByAdmin`.

## 5. Logs & Observabilite
- Constat: la plupart des erreurs sont remontees avec `console.error` + toast (ex: `src/components/admin/AdminChatView.jsx:214-233`), mais aucun horodatage ni contexte conversation n'est loggue, ce qui nuit a la correlation avec les logs Supabase.
  - Remediation: centraliser un helper `logChatError({ scope, conversationId, error })` qui ecrit une structure JSON (niveau warn/error) avant toast.

## 6. CI/CD & Environnement
- Ecart: le workflow FTPS deploye `dist/` sur `server-dir: ./` avec `dangerous-clean-slate: true` (`.github/workflows/deploy.yml:59-61`) sans dry-run ni sauvegarde. La suppression recursive peut effacer des fichiers hors build.
  - Remediation: ajouter un job de verification (build + tests sur `pull_request`), activer `dry-run: true` sur la premiere passe puis lancer le wipe sur un sous-dossier dedie (`public_html/notionlab/`) apres archivage de N-1.
- Constat: les seules variables critiques cote front sont `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (`src/lib/customSupabaseClient.js:3-17`). Aucun secret service-role ne doit etre injecte; surveiller `.env` pour rester en phase.

## 7. Performance
- Constat: `AdminLiveChatPanel` refetch la liste complete a chaque broadcast conversation/message (`src/components/admin/AdminLiveChatPanel.jsx:187-229`), ce qui degrade la latence quand le volume augmente.
  - Remediation: restreindre le refetch aux cas structuraux (nouvelle conversation, changement de staff/status) et appliquer un patch local pour les simples messages (`summary`, `updated_at`).
- Constat: les listener `subscribeToClientChatMessages` et `useClientChatIndicator` multiplient les invalidations react-query au moindre evenement staff (`src/hooks/useClientChatIndicator.jsx:66-116`).
  - Remediation: deriver un `queryClient.setQueryData` cible pour marquer la conversation comme unread au lieu d'invalider toutes les conversations.

## 8. Postgres changes vs broadcast
- Etat actuel: le fallback `postgres_changes` reste indispensable car `AdminChatView` et `ChatWidget` n'emet pas encore de broadcast (`src/components/admin/AdminChatView.jsx:143`, `src/components/ChatWidget.jsx:141`).
- Cible: apres migration vers `chatApi.sendMessage`, retirer l'ecoute SQL, conserver `broadcastMessageChange` comme voie unique et supprimer l'hydratation SQL systematique.

## 9. Actions critiques (ordre de priorite)
1. Activer RLS sur `chat_conversations` / `chat_messages` et livrer les RPC `client_mark_chat_viewed` / `admin_mark_chat_viewed`.
2. Refactorer `ChatWidget` et `AdminChatView` pour passer exclusivement par `chatApi` et emettre des broadcast.
3. Aligner la config des canaux (`ack: true`) et supprimer le fallback `postgres_changes` cote client une fois le refactor merge.
4. Durcir le workflow FTPS (dry-run, dossier cible, sauvegarde) et ajouter un smoke test avant release.
