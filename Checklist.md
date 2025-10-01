# Checklist Remediations

- [ ] Activer `row level security` sur `public.chat_conversations` et `public.chat_messages`, deployer les policies client/staff/widget, puis livrer les RPC `client_mark_chat_viewed` et `admin_mark_chat_viewed`.
- [ ] Refactorer `components/ChatWidget.jsx` pour utiliser exclusivement `chatApi` (creation, envoi, archivage) et supprimer `supabase.channel('chat_*')`.
- [ ] Refactorer `components/admin/AdminChatView.jsx` pour reutiliser `chatApi.sendMessage|sendFile|sendResource`, emettre les broadcast et retirer le listener `postgres_changes`.
- [ ] Remplacer `chatApi.getOrCreateConversation` par `chatApi.startClientConversation` sur l''ensemble du front et supprimer l''insert direct.
- [ ] Uniformiser `ack: true` sur tous les canaux broadcast et gerer les echecs d''envoi (log + toast).
- [ ] Optimiser `subscribeToClientChatMessages` / `useClientChatIndicator` pour eviter les requetes SQL et invalidations inutiles.
- [ ] Durcir `.github/workflows/deploy.yml` (dry-run, dossier cible, backup, job de tests sur PR).
- [ ] Introduire un helper `logChatError` structure (scope, conversationId, error) avant chaque toast.
