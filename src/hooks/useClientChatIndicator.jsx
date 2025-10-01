import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClientChatStatus,
  markConversationViewedByClient,
  subscribeToClientChatMessages,
  subscribeToClientConversations,
} from '@/lib/chatApi';

const STAFF_SENDERS = new Set(['admin', 'owner', 'prof']);
const isStaffSender = (sender) => STAFF_SENDERS.has(String(sender || '').toLowerCase());

const computeConversationHasUnread = (conversation) => {
  if (!conversation) return false;

  if (typeof conversation.hasUnread === 'boolean') return conversation.hasUnread;
  if (typeof conversation.has_unread === 'boolean') return conversation.has_unread;

  const latestMessageSender = conversation.latestMessageSender ?? conversation.latest_message_sender;
  const latestMessageAt = conversation.latestMessageAt ?? conversation.latest_message_at;
  const clientLastViewedAt = conversation.clientLastViewedAt ?? conversation.client_last_viewed_at;

  if (!isStaffSender(latestMessageSender)) return false;
  if (!latestMessageAt) return false;
  if (!clientLastViewedAt) return true;

  try {
    return new Date(latestMessageAt).getTime() > new Date(clientLastViewedAt).getTime();
  } catch (_) {
    return false;
  }
};

const STATUS_QUERY_KEY = (guestKey) => ['client-chat-status', guestKey];
const DEFAULT_CONTEXT_VALUE = {
  hasUnread: false,
  conversations: [],
  isLoading: false,
  unreadNotification: null,
  markAsRead: () => Promise.resolve(),
  refetchStatus: () => Promise.resolve(),
  acknowledgeUnreadNotification: () => {},
};

const ClientChatIndicatorContext = createContext(undefined);

const computeHasUnread = (conversations) => {
  if (!Array.isArray(conversations)) return false;
  return conversations.some((conversation) => computeConversationHasUnread(conversation));
};

export const ClientChatIndicatorProvider = ({ guestId, guestEmail, children }) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(guestId || guestEmail);
  const guestKey = guestId || guestEmail || 'anonymous';

  const { data, isLoading, refetch } = useQuery({
    queryKey: STATUS_QUERY_KEY(guestKey),
    queryFn: () => getClientChatStatus({ guestId, guestEmail }),
    enabled,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });

  const conversations = data?.conversations ?? [];
  const [unreadNotification, setUnreadNotification] = useState(null);
  const lastUnreadKeyRef = useRef(null);
  const hasUnread = data?.hasUnread ?? computeHasUnread(conversations);

  const conversationIds = useMemo(() => {
    if (!enabled) return [];
    return Array.from(new Set(conversations.map((conversation) => conversation.id).filter(Boolean)));
  }, [enabled, conversations]);

  useEffect(() => {
    if (!enabled) return undefined;

    const subscription = subscribeToClientConversations({ guestId, guestEmail }, () => {
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(guestKey) });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [enabled, guestEmail, guestId, guestKey, queryClient]);

  useEffect(() => {
    if (!enabled || conversationIds.length === 0) return undefined;

    const subscriptions = conversationIds
      .map((conversationId) =>
        subscribeToClientChatMessages(
          conversationId,
          (payload) => {
            if (!payload) return;
            const sender = payload?.new?.sender ?? payload?.old?.sender ?? null;
            if (isStaffSender(sender)) {
              queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(guestKey) });
            }
          },
          {
            onFallback: async () => {
              queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(guestKey) });
            },
          }
        )
      )
      .filter(Boolean);

    return () => {
      subscriptions.forEach((subscription) => {
        subscription?.unsubscribe?.();
      });
    };
  }, [conversationIds, enabled, guestKey, queryClient]);

  useEffect(() => {
    if (!enabled) {
      setUnreadNotification(null);
      lastUnreadKeyRef.current = null;
      return;
    }

    const unreadConversations = conversations.filter((conversation) =>
      computeConversationHasUnread(conversation)
    );

    if (unreadConversations.length === 0) {
      setUnreadNotification(null);
      lastUnreadKeyRef.current = null;
      return;
    }

    const latest = unreadConversations.reduce((acc, conversation) => {
      if (!acc) return conversation;
      const candidate = conversation.latestMessageAt ?? conversation.latest_message_at ?? null;
      const current = acc.latestMessageAt ?? acc.latest_message_at ?? null;
      if (!candidate) return acc;
      if (!current) return conversation;
      try {
        return new Date(candidate).getTime() > new Date(current).getTime() ? conversation : acc;
      } catch (_) {
        return acc;
      }
    }, null);

    const latestMessageAt =
      latest?.latestMessageAt ?? latest?.latest_message_at ?? null;

    if (!latestMessageAt) {
      return;
    }

    const latestKey = `${latest.id}:${latestMessageAt}`;
    if (latestKey !== lastUnreadKeyRef.current) {
      lastUnreadKeyRef.current = latestKey;
      setUnreadNotification({
        conversationId: latest.id,
        latestMessageAt,
      });
    }
  }, [conversations, enabled]);

  const markAsRead = useCallback(async (conversationId) => {
    if (!enabled || !conversationId) return;
    const nowIso = new Date().toISOString();

    queryClient.setQueryData(STATUS_QUERY_KEY(guestKey), (previous) => {
      if (!previous) return previous;
      const updatedConversations = previous.conversations.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        return {
          ...conversation,
          clientLastViewedAt: nowIso,
          client_last_viewed_at: nowIso,
          hasUnread: false,
          has_unread: false,
        };
      });
      return {
        conversations: updatedConversations,
        hasUnread: computeHasUnread(updatedConversations),
      };
    });

    try {
      await markConversationViewedByClient(conversationId);
    } finally {
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(guestKey) });
    }
  }, [enabled, guestKey, queryClient]);

  const acknowledgeUnreadNotification = useCallback(() => {
    setUnreadNotification(null);
  }, []);
  const value = useMemo(() => ({
    hasUnread: enabled ? hasUnread : false,
    conversations: enabled ? conversations : [],
    isLoading: enabled ? isLoading : false,
    unreadNotification: enabled ? unreadNotification : null,
    markAsRead: enabled ? markAsRead : DEFAULT_CONTEXT_VALUE.markAsRead,
    refetchStatus: enabled ? refetch : DEFAULT_CONTEXT_VALUE.refetchStatus,
    acknowledgeUnreadNotification: enabled ? acknowledgeUnreadNotification : DEFAULT_CONTEXT_VALUE.acknowledgeUnreadNotification,
  }), [acknowledgeUnreadNotification, conversations, enabled, hasUnread, isLoading, markAsRead, refetch, unreadNotification]);

  const contextValue = enabled ? value : DEFAULT_CONTEXT_VALUE;
  return (
    <ClientChatIndicatorContext.Provider value={contextValue}>
      {children}
    </ClientChatIndicatorContext.Provider>
  );
};

export const useClientChatIndicator = () => {
  const context = useContext(ClientChatIndicatorContext);
  if (!context) {
    throw new Error('useClientChatIndicator must be used within a ClientChatIndicatorProvider');
  }
  return context;
};
