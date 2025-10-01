import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveClientConversation,
  clearChatHistory,
  fetchMessages,
  getClientGuestIdentifiers,
  listChatStaffUsers,
  listClientConversations,
  markConversationViewedByClient,
  sendFile,
  sendMessage,
  sendResource,
  startClientConversation,
  subscribeToClientChatMessages,
  subscribeToClientConversations,
} from '@/lib/chatApi';
import { useToast } from '@/components/ui/use-toast';

const CONVERSATIONS_KEY = (guestKey) => ['client-live-chat', 'conversations', guestKey];
const MESSAGES_KEY = (conversationId) => ['client-live-chat', 'messages', conversationId];
const ARCHIVED_STATUSES = new Set(['resolu', 'abandonne']);
const STAFF_USER_TYPES = new Set(['admin', 'owner', 'prof']);
const STAFF_SENDERS = new Set(['admin', 'owner', 'prof']);

const sortConversationsByUpdatedAt = (list) => {
  if (!Array.isArray(list)) return list;
  return [...list].sort((a, b) => {
    const aDate = new Date(a?.updated_at || a?.created_at || 0).getTime();
    const bDate = new Date(b?.updated_at || b?.created_at || 0).getTime();
    return bDate - aDate;
  });
};

const deriveSummaryFromMessage = (message) => {
  if (!message) return null;
  if (message.content && message.content.trim().length > 0) {
    return message.content.trim().slice(0, 120);
  }
  if (message.resource_id) {
    return 'Ressource partagee';
  }
  if (message.file_url) {
    return 'Piece jointe partagee';
  }
  return '';
};

const computeUnreadStatus = (conversation, message) => {
  if (!message || !STAFF_SENDERS.has(message.sender || '')) {
    return conversation?.has_unread ?? false;
  }
  const existing = conversation?.has_unread ?? false;
  if (!conversation?.client_last_viewed_at) {
    return true;
  }
  try {
    const messageCreatedAt = new Date(message.created_at || Date.now()).getTime();
    const lastViewedAt = new Date(conversation.client_last_viewed_at).getTime();
    return existing || messageCreatedAt > lastViewedAt;
  } catch (_err) {
    return true;
  }
};

const sortMessagesByCreatedAt = (list) => {
  if (!Array.isArray(list)) return list;
  return [...list].sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime();
    const bTime = new Date(b?.created_at || 0).getTime();
    return aTime - bTime;
  });
};

const enrichConversationFromRecord = (record, previous = null, staffMap = new Map()) => {
  if (!record) return previous;
  const staffInfo = record.staff_user_id ? staffMap.get(record.staff_user_id) : null;
  const hasUnread = typeof record.has_unread === 'boolean' ? record.has_unread : previous?.has_unread ?? false;
  return {
    ...(previous || {}),
    ...record,
    staff_user_id: record.staff_user_id || previous?.staff_user_id || null,
    staff_user_type: staffInfo?.user_type || record.staff_user_type || previous?.staff_user_type || null,
    staff_first_name: staffInfo?.first_name || record.staff_first_name || previous?.staff_first_name || null,
    staff_last_name: staffInfo?.last_name || record.staff_last_name || previous?.staff_last_name || null,
    client_archived:
      typeof record.client_archived === 'boolean'
        ? record.client_archived
        : Boolean(record.client_archived ?? previous?.client_archived),
    has_unread: hasUnread,
  };
};

export const useClientLiveChat = ({ user, initialConversationId = null } = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { guestId, guestEmail, guestKey } = getClientGuestIdentifiers(user);
  const normalizedGuestKey = guestKey || guestEmail || guestId || 'anonymous';
  console.debug('client-live-chat identifiers', { guestId, guestEmail, guestKey, normalizedGuestKey });
  const [view, setView] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState(initialConversationId);
  const initialConversationRef = useRef(initialConversationId);
  const isStaff = Boolean(user?.profile?.user_type && STAFF_USER_TYPES.has(user.profile.user_type));
  const identifiersReady = Boolean(guestId || guestEmail);

  const refreshConversations = useCallback(() => {
    queryClient
      .invalidateQueries({ queryKey: CONVERSATIONS_KEY(normalizedGuestKey) })
      .catch((error) => {
        console.error('Refetch conversations failed', error);
      });
  }, [normalizedGuestKey, queryClient]);

  const conversationsQuery = useQuery({
    queryKey: CONVERSATIONS_KEY(normalizedGuestKey),
    queryFn: () => listClientConversations(user),
    enabled: identifiersReady,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const staffRecipientsQuery = useQuery({
    queryKey: ['client-live-chat', 'staff-recipients'],
    queryFn: () => listChatStaffUsers(),
    enabled: identifiersReady,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const staffRecipients = staffRecipientsQuery.data ?? [];
  const staffById = useMemo(() => {
    const map = new Map();
    staffRecipients.forEach((staff) => {
      if (staff?.id) {
        map.set(staff.id, staff);
      }
    });
    return map;
  }, [staffRecipients]);

  const conversations = conversationsQuery.data ?? [];

  const upsertConversationInCache = useCallback(
    (conversation) => {
      if (!conversation?.id) return;
      queryClient.setQueryData(CONVERSATIONS_KEY(normalizedGuestKey), (existing) => {
        const list = Array.isArray(existing) ? [...existing] : [];
        const index = list.findIndex((item) => item.id === conversation.id);
        if (index >= 0) {
          list[index] = { ...list[index], ...conversation };
        } else {
          list.push(conversation);
        }
        return sortConversationsByUpdatedAt(list);
      });
    },
    [normalizedGuestKey, queryClient]
  );

  const patchConversationInCache = useCallback(
    (conversationId, updater) => {
      if (!conversationId || typeof updater !== 'function') return;
      queryClient.setQueryData(CONVERSATIONS_KEY(normalizedGuestKey), (existing) => {
        if (!Array.isArray(existing)) return existing;
        let changed = false;
        const updated = existing.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          const next = updater(conversation);
          if (!next) return conversation;
          if (next !== conversation) {
            changed = true;
          }
          return next;
        });
        return changed ? sortConversationsByUpdatedAt(updated) : existing;
      });
    },
    [normalizedGuestKey, queryClient]
  );

  const removeConversationFromCache = useCallback(
    (conversationId) => {
      if (!conversationId) return;
      queryClient.setQueryData(CONVERSATIONS_KEY(normalizedGuestKey), (existing) => {
        if (!Array.isArray(existing)) return existing;
        return existing.filter((conversation) => conversation.id !== conversationId);
      });
    },
    [normalizedGuestKey, queryClient]
  );

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const messagesQuery = useQuery({
    queryKey: MESSAGES_KEY(selectedConversationId),
    queryFn: () => fetchMessages(selectedConversationId),
    enabled: Boolean(selectedConversationId),
    refetchOnWindowFocus: false,
  });

  const messages = messagesQuery.data ?? [];

  const { mutate: markConversationAsViewed } = useMutation({
    mutationFn: (conversationId) => markConversationViewedByClient(conversationId),
    onError: () => {
      refreshConversations();
    },
  });

  const lastMarkedConversationRef = useRef({
    conversationId: null,
    clientLastViewedAt: null,
    lastStaffMessageAt: null,
  });

  const archiveMutation = useMutation({
    mutationFn: ({ conversationId, archived }) => archiveClientConversation(conversationId, archived),
    onMutate: async ({ conversationId, archived }) => {
      await queryClient.cancelQueries({ queryKey: CONVERSATIONS_KEY(normalizedGuestKey) });
      const prevData = queryClient.getQueryData(CONVERSATIONS_KEY(normalizedGuestKey));
      queryClient.setQueryData(CONVERSATIONS_KEY(normalizedGuestKey), (existing) => {
        if (!Array.isArray(existing)) return existing;
        return existing.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, client_archived: archived, status: archived ? 'resolu' : 'ouvert' }
            : conversation
        );
      });
      return { prevData };
    },
    onError: (error, _variables, context) => {
      if (context?.prevData) {
        queryClient.setQueryData(CONVERSATIONS_KEY(normalizedGuestKey), context.prevData);
      }
      toast({
        title: 'Erreur',
        description: error?.message || "Impossible de mettre a jour l'archivage de la conversation.",
        variant: 'destructive',
      });
    },
    onSuccess: (record) => {
      if (record?.id) {
        patchConversationInCache(record.id, (previous) =>
          enrichConversationFromRecord(record, previous, staffById)
        );
      }
    },
    onSettled: () => {
      refreshConversations();
    },
  });

  const conversationsByView = useMemo(() => {
    const active = [];
    const archived = [];
    conversations.forEach((conversation) => {
      const isArchived = conversation.client_archived || ARCHIVED_STATUSES.has(conversation.status);
      if (isArchived) archived.push(conversation);
      else active.push(conversation);
    });
    return { active, archived };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const targetList = view === 'archived' ? conversationsByView.archived : conversationsByView.active;
    if (!searchTerm.trim()) return targetList;
    const lowered = searchTerm.trim().toLowerCase();
    return targetList.filter((conversation) => {
      const summary = conversation.summary ? conversation.summary.toLowerCase() : '';
      const status = conversation.status ? conversation.status.toLowerCase() : '';
      let updated = '';
      if (conversation.updated_at) {
        try {
          updated = new Date(conversation.updated_at).toLocaleString('fr-FR').toLowerCase();
        } catch (_err) {
          updated = String(conversation.updated_at).toLowerCase();
        }
      }
      const staffName = `${conversation.staff_first_name || ''} ${conversation.staff_last_name || ''}`.trim().toLowerCase();
      const staffRole = conversation.staff_user_type ? conversation.staff_user_type.toLowerCase() : '';
      return (
        summary.includes(lowered) ||
        status.includes(lowered) ||
        updated.includes(lowered) ||
        staffName.includes(lowered) ||
        staffRole.includes(lowered)
      );
    });
  }, [conversationsByView, searchTerm, view]);

  const ensureSelection = useCallback(() => {
    if (!identifiersReady) return;

    const targetList = view === 'archived' ? conversationsByView.archived : conversationsByView.active;
    const selectedConversation =
      selectedConversationId
        ? conversations.find((conversation) => conversation.id === selectedConversationId)
        : null;
    const selectedInTarget =
      Boolean(selectedConversationId) && targetList.some((conversation) => conversation.id === selectedConversationId);

    if (!selectedConversationId) {
      const withInitial = initialConversationRef.current
        ? targetList.find((conversation) => conversation.id === initialConversationRef.current)
        : null;
      if (withInitial) {
        setSelectedConversationId(withInitial.id);
        initialConversationRef.current = null;
        return;
      }
      const firstConversation = targetList[0] || null;
      if (firstConversation) {
        initialConversationRef.current = null;
        setSelectedConversationId(firstConversation.id);
        return;
      }
      initialConversationRef.current = null;
      setSelectedConversationId(null);
      return;
    }

    if (!selectedConversation) {
      return;
    }

    if (selectedInTarget) {
      return;
    }

    const fallback = targetList[0] || null;
    if (fallback) {
      initialConversationRef.current = null;
      setSelectedConversationId(fallback.id);
      return;
    }

    initialConversationRef.current = null;
    setSelectedConversationId(null);
  }, [conversations, conversationsByView, identifiersReady, selectedConversationId, view]);

  useEffect(() => {
    ensureSelection();
  }, [ensureSelection, conversations, view]);

  useEffect(() => {
    if (!selectedConversationId) return;
    console.debug('client-live-chat subscribe:start', {
      selectedConversationId,
      messageCount: messages?.length ?? 0,
    });
    const subscription = subscribeToClientChatMessages(
      selectedConversationId,
      (payload) => {
        console.debug('client-live-chat realtime payload', payload);
        const message = payload?.new;
        if (!message?.conversation_id) {
          return;
        }

        patchConversationInCache(message.conversation_id, (conversation) => {
          if (!conversation) return conversation;
          const summary = deriveSummaryFromMessage(message);
          return {
            ...conversation,
            summary: summary ?? conversation.summary,
            updated_at: message.created_at || conversation.updated_at,
            has_unread: computeUnreadStatus(conversation, message),
          };
        });

        queryClient.setQueryData(MESSAGES_KEY(message.conversation_id), (existing) => {
          const nextMessages = Array.isArray(existing) ? [...existing] : [];
          const index = nextMessages.findIndex((item) => item.id === message.id);
          if (index >= 0) {
            nextMessages[index] = { ...nextMessages[index], ...message };
          } else {
            nextMessages.push(message);
          }
          return sortMessagesByCreatedAt(nextMessages);
        });
      },
      {
        onFallback: async () => {
          try {
            const data = await fetchMessages(selectedConversationId);
            queryClient.setQueryData(MESSAGES_KEY(selectedConversationId), sortMessagesByCreatedAt(Array.isArray(data) ? data : []));
          } catch (error) {
            console.error('client-live-chat hook message fallback failed', { conversationId: selectedConversationId, error });
          }
        },
      }
    );
    return () => {
      console.debug('client-live-chat subscribe:cleanup', { selectedConversationId });
      subscription?.unsubscribe?.();
    };
  }, [patchConversationInCache, queryClient, selectedConversationId]);

  useEffect(() => {
    if (!identifiersReady) return;
    const subscription = subscribeToClientConversations({ guestId, guestEmail }, (payload) => {
      if (!payload) {
        refreshConversations();
        return;
      }
      const eventType = payload?.eventType;
      const newRecord = payload?.new;
      const oldRecord = payload?.old;
      if (eventType === 'INSERT' && newRecord) {
        const enriched = enrichConversationFromRecord(newRecord, null, staffById);
        upsertConversationInCache(enriched);
        return;
      }
      if (eventType === 'UPDATE' && newRecord) {
        patchConversationInCache(newRecord.id, (previous) =>
          enrichConversationFromRecord(newRecord, previous, staffById)
        );
        return;
      }
      if (eventType === 'DELETE' && oldRecord?.id) {
        removeConversationFromCache(oldRecord.id);
        return;
      }
      refreshConversations();
    });
    return () => {
      subscription?.unsubscribe?.();
    };
  }, [guestEmail, guestId, identifiersReady, patchConversationInCache, refreshConversations, removeConversationFromCache, staffById, upsertConversationInCache]);

  useEffect(() => {
    if (!selectedConversationId) return;
    if (!selectedConversation) return;

    const latestStaffMessageAt = (() => {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message?.created_at && STAFF_SENDERS.has(message?.sender || '')) {
          return message.created_at;
        }
      }
      return null;
    })();

    const lastViewedAt = selectedConversation.client_last_viewed_at
      ? new Date(selectedConversation.client_last_viewed_at).getTime()
      : null;
    const latestStaffTimestamp = latestStaffMessageAt
      ? new Date(latestStaffMessageAt).getTime()
      : null;

    const hasNewStaffMessage =
      latestStaffTimestamp !== null &&
      (lastViewedAt === null || latestStaffTimestamp > lastViewedAt);

    const isNewConversationSelection =
      selectedConversationId !== lastMarkedConversationRef.current.conversationId;

    if (!isNewConversationSelection && !hasNewStaffMessage) {
      return;
    }

    const nowIso = new Date().toISOString();

    patchConversationInCache(selectedConversationId, (conversationState) => {
      if (!conversationState) return conversationState;
      return {
        ...conversationState,
        client_last_viewed_at: nowIso,
        has_unread: false,
      };
    });

    markConversationAsViewed(selectedConversationId);

    lastMarkedConversationRef.current = {
      conversationId: selectedConversationId,
      clientLastViewedAt: nowIso,
      lastStaffMessageAt: latestStaffMessageAt,
    };
  }, [selectedConversationId, selectedConversation, messages, markConversationAsViewed, patchConversationInCache]);

  useEffect(() => {
    if (!initialConversationId) return;
    setSelectedConversationId(initialConversationId);
    initialConversationRef.current = initialConversationId;
  }, [initialConversationId]);

  const selectConversation = useCallback((conversationId) => {
    setSelectedConversationId(conversationId);
  }, []);

  const toggleArchive = useCallback(
    (conversationId, archived) => {
      archiveMutation.mutate({ conversationId, archived });
    },
    [archiveMutation]
  );

  const sendTextMessage = useCallback(async (content) => {
    if (!selectedConversationId || !content?.trim()) return;
    await sendMessage(selectedConversationId, content.trim(), isStaff);
    queryClient.invalidateQueries({ queryKey: MESSAGES_KEY(selectedConversationId) });
  }, [isStaff, queryClient, selectedConversationId]);

  const sendFileMessage = useCallback(async (file) => {
    if (!selectedConversationId || !file) return;
    const targetGuestId = selectedConversation?.guest_id || guestId;
    if (!targetGuestId) throw new Error('Identifiant de conversation manquant.');
    await sendFile(file, { id: selectedConversationId, guest_id: targetGuestId }, isStaff);
    queryClient.invalidateQueries({ queryKey: MESSAGES_KEY(selectedConversationId) });
  }, [guestId, isStaff, queryClient, selectedConversation?.guest_id, selectedConversationId]);

  const sendResourceMessage = useCallback(async (resource) => {
    if (!selectedConversationId || !resource) return;
    await sendResource(resource, selectedConversationId, isStaff);
    queryClient.invalidateQueries({ queryKey: MESSAGES_KEY(selectedConversationId) });
  }, [isStaff, queryClient, selectedConversationId]);

  const clearConversationHistory = useCallback(async () => {
    if (!selectedConversationId) return;
    await clearChatHistory(selectedConversationId);
    queryClient.invalidateQueries({ queryKey: MESSAGES_KEY(selectedConversationId) });
  }, [queryClient, selectedConversationId]);

  const startConversation = useCallback(async ({ staffUserId = null, initialMessage = '' } = {}) => {
    const conversation = await startClientConversation({ staffUserId, initialMessage, forceNew: true });
    const enriched = enrichConversationFromRecord(conversation, null, staffById);
    upsertConversationInCache({ ...enriched, has_unread: Boolean(conversation?.has_unread) });

    queryClient.setQueryData(MESSAGES_KEY(conversation.id), (existing) => (Array.isArray(existing) ? existing : []));

    initialConversationRef.current = conversation.id;
    setSelectedConversationId(conversation.id);
    setView('active');
    setSearchTerm('');

    queryClient
      .invalidateQueries({ queryKey: CONVERSATIONS_KEY(normalizedGuestKey), exact: true, type: 'inactive' })
      .catch((error) => {
        console.error('Refetch conversations failed after starting conversation', error);
      });

    return conversation;
  }, [normalizedGuestKey, queryClient, setSearchTerm, setView, staffById, upsertConversationInCache]);

  return {
    guestKey: normalizedGuestKey,
    isStaff,
    identifiersReady,
    conversations,
    filteredConversations,
    conversationsByView,
    staffRecipients,
    isLoadingStaffRecipients: staffRecipientsQuery.isLoading,
    isFetchingStaffRecipients: staffRecipientsQuery.isFetching,
    refetchStaffRecipients: staffRecipientsQuery.refetch,
    view,
    setView,
    searchTerm,
    setSearchTerm,
    selectConversation,
    selectedConversation,
    selectedConversationId,
    isLoadingConversations: conversationsQuery.isLoading,
    isFetchingConversations: conversationsQuery.isFetching,
    isLoadingMessages: messagesQuery.isLoading,
    messages,
    startConversation,
    sendTextMessage,
    sendFileMessage,
    sendResourceMessage,
    clearConversationHistory,
    toggleArchive,
  };
};





