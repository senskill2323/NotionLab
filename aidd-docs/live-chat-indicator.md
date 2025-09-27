# Live Chat Client Indicator

## Donn�es persist�es
- Colonne `client_last_viewed_at` ajout�e dans `public.chat_conversations` pour tracer la derniere consultation cote client.
- Index `chat_conversations_client_last_viewed_idx` pour les requ�tes d'�tat et policy `client_update_chat_last_viewed` autorisant les clients a mettre a jour uniquement ce champ.

## API & Helpers
- `getClientChatStatus({ guestId, guestEmail })` renvoie `{ conversations, hasUnread }` en comparant le dernier message admin a `client_last_viewed_at`.
- `markConversationViewedByClient(conversationId)` met a jour la colonne avec un ISO timestamp cote client.
- `subscribeToClientChatMessages` et `subscribeToClientConversations` exposent des canaux realtime d�di�s aux invalidations.

## Hook & Contexte
- `ClientChatIndicatorProvider` (src/hooks/useClientChatIndicator.jsx) encapsule React Query + subscriptions et fournit `hasUnread`, `conversations`, `markAsRead`, `refetchStatus` via `useClientChatIndicator()`.
- Le provider est initialis� dans `AppContent` avec `guestId` (si disponible) et `guestEmail` (fallback) afin que Navigation, ChatPage et ChatWidget partagent l'�tat.

## UX
- Navigation affiche une pastille verte anim�e sur le bouton �Le Chat� via `hasUnread`.
- `ChatPage` et `ChatWidget` appellent `markAsRead` a l'ouverture et lorsqu'un nouveau message admin arrive pendant la session, garantissant la synchro de l'indicateur.
