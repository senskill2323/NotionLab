import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ConversationsSidebar, { ConversationsSidebarSkeleton } from './components/ConversationsSidebar';
import ClientConversationView from './components/ClientConversationView';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { getClientGuestIdentifiers, listChatStaffUsers, startClientConversation } from '@/lib/chatApi';
import { v4 as uuidv4 } from 'uuid';

const BROADCAST_EVENT_CONVERSATION = 'conversation';
const BROADCAST_EVENT_MESSAGE = 'message';
const AUTO_ARCHIVED_STATUSES = new Set(['resolu', 'abandonne']);
const STAFF_SENDERS = new Set(['admin', 'owner', 'prof']);

const normalizeClientConversation = (conversation) => {
  if (!conversation) return conversation;
  return {
    ...conversation,
    client_archived: Boolean(conversation.client_archived),
    has_unread: Boolean(conversation.has_unread),
    staff_user_id: conversation.staff_user_id || null,
    staff_user_type: conversation.staff_user_type || null,
    staff_first_name: conversation.staff_first_name || null,
    staff_last_name: conversation.staff_last_name || null,
    summary: conversation.summary || '',
  };
};

const sortConversationsByUpdatedAt = (list) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
    const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
    return bTime - aTime;
  });
};

const sortMessagesAscending = (list) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime();
    const bTime = new Date(b?.created_at || 0).getTime();
    return aTime - bTime;
  });
};

const getClientConversationTopic = ({ guestId, guestEmail }) => {
  const parts = ['client-chat-conversations'];
  if (guestId) parts.push(guestId);
  if (guestEmail) parts.push(guestEmail);
  return parts.length > 1 ? parts.join('-') : null;
};

const ClientLiveChatPage = () => {
  const { user, authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const conversationParam = searchParams.get('conversation');

  const { guestId, guestEmail, guestKey } = getClientGuestIdentifiers(user);
  const identifiersReady = Boolean(guestId || guestEmail);
  const isStaff = Boolean(user?.profile?.user_type && STAFF_SENDERS.has(user.profile.user_type));

  const [conversations, setConversations] = useState([]);
  const [view, setView] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState(conversationParam);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [staffRecipients, setStaffRecipients] = useState([]);
  const [isLoadingStaffRecipients, setIsLoadingStaffRecipients] = useState(false);

  const conversationsChannelRef = useRef(null);
  const messagesChannelRef = useRef(null);

  const hydrateMessage = useCallback(async (message) => {
    if (!message?.id) return message;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, resource:resources(id, name, url, file_path)')
        .eq('id', message.id)
        .single();
      if (!error && data) {
        return data;
      }
    } catch (error) {
      console.error('hydrateMessage failed', error);
    }
    return message;
  }, []);


  useEffect(() => {
    if (!selectedConversationId && conversationParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('conversation');
      setSearchParams(next, { replace: true });
    } else if (selectedConversationId && selectedConversationId !== conversationParam) {
      const next = new URLSearchParams(searchParams);
      next.set('conversation', selectedConversationId);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationParam, selectedConversationId]);

  const fetchStaffRecipients = useCallback(async () => {
    setIsLoadingStaffRecipients(true);
    try {
      const data = await listChatStaffUsers();
      setStaffRecipients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('client-live-chat list staff failed', error);
      toast({
        title: 'Erreur',
        description: "Impossible de charger les destinataires.",
        variant: 'destructive',
      });
    } finally {
      setIsLoadingStaffRecipients(false);
    }
  }, [toast]);

  const fetchConversations = useCallback(
    async ({ background = false } = {}) => {
      if (!identifiersReady) return;
      if (!background) {
        setIsLoadingConversations(true);
      }

      try {
        const { data, error } = await supabase.rpc('get_chat_conversations_with_details');
        if (error) throw error;
        const normalized = sortConversationsByUpdatedAt(
          (Array.isArray(data) ? data : []).map(normalizeClientConversation)
        );
        setConversations(normalized);
        if (!selectedConversationId && normalized.length > 0) {
          setSelectedConversationId(normalized[0].id);
        }
      } catch (error) {
        console.error('client-live-chat fetch conversations failed', error);
        toast({
          title: 'Erreur',
          description: "Impossible de charger les conversations.",
          variant: 'destructive',
        });
      } finally {
        setIsLoadingConversations(false);
      }
    },
    [identifiersReady, selectedConversationId, toast]
  );

  const updateConversationFromMessage = useCallback(
    (message) => {
      if (!message?.conversation_id) return;
      setConversations((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const updated = prev.map((conversation) => {
          if (conversation.id !== message.conversation_id) return conversation;
          const isStaffMessage = STAFF_SENDERS.has(message.sender || '');
          const next = {
            ...conversation,
            summary: message.content?.substring(0, 120) || conversation.summary || '',
            updated_at: message.created_at || conversation.updated_at,
          };
          if (isStaffMessage) {
            next.has_unread = conversation.id !== selectedConversationId;
          } else if (conversation.id === selectedConversationId) {
            next.has_unread = false;
          }
          return next;
        });
        return sortConversationsByUpdatedAt(updated);
      });
    },
    [selectedConversationId]
  );

  const markConversationAsViewed = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      try {
        const nowIso = new Date().toISOString();
        await supabase
          .from('chat_conversations')
          .update({ client_last_viewed_at: nowIso, has_unread: false })
          .eq('id', conversationId);
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, client_last_viewed_at: nowIso, has_unread: false }
              : conversation
          )
        );
      } catch (error) {
        console.error('markConversationAsViewed failed', error);
      }
    },
    []
  );

  const fetchMessagesForConversation = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*, resource:resources(id, name, url, file_path)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        setMessages(Array.isArray(data) ? data : []);
        if (!isStaff) {
          await markConversationAsViewed(conversationId);
        }
      } catch (error) {
        console.error('client-live-chat fetch messages failed', error);
        toast({
          title: 'Erreur',
          description: "Impossible de charger les messages.",
          variant: 'destructive',
        });
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [isStaff, markConversationAsViewed, toast]
  );

  useEffect(() => {
    setSelectedConversation(
      selectedConversationId
        ? conversations.find((conversation) => conversation.id === selectedConversationId) || null
        : null
    );
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
      return;
    }

    const conversationId = selectedConversation.id;
    fetchMessagesForConversation(conversationId);

    const channel = supabase
      .channel(`client-chat-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload?.new;
          if (!message) return;
          setMessages((prev) => {
            const exists = prev.some((item) => item.id === message.id);
            if (exists) {
              return prev.map((item) => (item.id === message.id ? { ...item, ...message } : item));
            }
            return sortMessagesAscending([...prev, message]);
          });
          updateConversationFromMessage(message);
          if (!isStaff && STAFF_SENDERS.has(message.sender || '') && message.conversation_id === selectedConversationId) {
            markConversationAsViewed(message.conversation_id).catch((error) => {
              console.error('markConversationAsViewed on message failed', error);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload?.new;
          if (!message) return;
          setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, ...message } : item)));
          updateConversationFromMessage(message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedMessage = payload?.old;
          if (!deletedMessage?.id) return;
          setMessages((prev) => prev.filter((item) => item.id !== deletedMessage.id));
        }
      );

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('client-live-chat message channel issue', { status, conversationId });
      }
    });

    messagesChannelRef.current = channel;

    return () => {
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, [fetchMessagesForConversation, isStaff, markConversationAsViewed, selectedConversation, selectedConversationId, updateConversationFromMessage]);

  useEffect(() => {
    if (!identifiersReady) return;
    fetchConversations();
    fetchStaffRecipients();
  }, [fetchConversations, fetchStaffRecipients, identifiersReady]);

  const handleConversationBroadcast = useCallback(
    (payload) => {
      if (!payload) return;
      const eventType = payload.eventType;
      const newRecord = payload.new;
      const oldRecord = payload.old;

      setConversations((prev) => {
        let next = Array.isArray(prev) ? [...prev] : [];
        if (eventType === 'INSERT' && newRecord) {
          const normalized = normalizeClientConversation(newRecord);
          const exists = next.some((conversation) => conversation.id === normalized.id);
          if (!exists) {
            next.push(normalized);
          } else {
            next = next.map((conversation) =>
              conversation.id === normalized.id ? { ...conversation, ...normalized } : conversation
            );
          }
        } else if (eventType === 'UPDATE' && newRecord) {
          const normalized = normalizeClientConversation(newRecord);
          next = next.map((conversation) =>
            conversation.id === normalized.id ? { ...conversation, ...normalized } : conversation
          );
        } else if (eventType === 'DELETE' && oldRecord?.id) {
          next = next.filter((conversation) => conversation.id !== oldRecord.id);
        }
        return sortConversationsByUpdatedAt(next);
      });
    },
    []
  );

  useEffect(() => {
    if (!identifiersReady) return undefined;
    const topic = getClientConversationTopic({ guestId, guestEmail });
    if (!topic) return undefined;

    const channel = supabase.channel(topic, { config: { broadcast: { self: true, ack: true } } });
    channel.on('broadcast', { event: BROADCAST_EVENT_CONVERSATION }, (event) => {
      handleConversationBroadcast(event?.payload ?? null);
    });
    channel.on('broadcast', { event: BROADCAST_EVENT_MESSAGE }, (event) => {
      const message = event?.payload?.new;
      if (message) {
        updateConversationFromMessage(message);
      }
    });

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('client-live-chat conversation channel issue', { status, topic });
      }
    });

    conversationsChannelRef.current = channel;

    return () => {
      if (conversationsChannelRef.current) {
        supabase.removeChannel(conversationsChannelRef.current);
        conversationsChannelRef.current = null;
      }
    };
  }, [guestEmail, guestId, handleConversationBroadcast, identifiersReady, updateConversationFromMessage]);

  const filteredConversations = useMemo(() => {
    const lowered = searchTerm.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const status = (conversation.status || '').toLowerCase();
      const isAutoArchived = AUTO_ARCHIVED_STATUSES.has(status);
      const isArchived = conversation.client_archived || isAutoArchived;
      if (view === 'archived' && !isArchived) return false;
      if (view === 'active' && isArchived) return false;
      if (!lowered) return true;
      const haystacks = [
        conversation.staff_first_name,
        conversation.staff_last_name,
        conversation.summary,
        conversation.guest_email,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return haystacks.some((value) => value.includes(lowered));
    });
  }, [conversations, searchTerm, view]);

  const handleSelectConversation = useCallback((conversationId) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleToggleArchive = useCallback(
    async (conversationId, archived) => {
      if (!conversationId) return;
      try {
        const { data, error } = await supabase.rpc('client_chat_set_archived', {
          p_id: conversationId,
          p_archived: !!archived,
        });
        if (error) throw error;
        const normalized = normalizeClientConversation(data);
        setConversations((prev) =>
          sortConversationsByUpdatedAt(
            prev.map((conversation) =>
              conversation.id === conversationId ? { ...conversation, ...normalized } : conversation
            )
          )
        );
        toast({
          title: 'Succes',
          description: archived ? 'Conversation archivee.' : 'Conversation desarchivee.',
        });
      } catch (error) {
        console.error('client-live-chat toggle archive failed', error);
        toast({
          title: 'Erreur',
          description: "Impossible de mettre a jour l'archivage.",
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleStartConversation = useCallback(
    async (staffUserId) => {
      try {
        if (!staffUserId) {
          toast({
            title: 'Destinataire requis',
            description: 'Choisis un destinataire avant de demarrer.',
            variant: 'destructive',
          });
          return;
        }
        const conversation = await startClientConversation({ staffUserId });
        const normalized = normalizeClientConversation(conversation);
        setConversations((prev) =>
          sortConversationsByUpdatedAt([
            ...prev.filter((item) => item.id !== normalized.id),
            normalized,
          ])
        );
        setSelectedConversationId(conversation.id);
        setView('active');
        setSearchTerm('');
      } catch (error) {
        console.error('client-live-chat start conversation failed', error);
        toast({
          title: 'Erreur',
          description: error?.message || 'Impossible de creer la conversation.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const sendTextMessage = useCallback(
    async (content) => {
      if (!selectedConversation?.id) return;
      const trimmed = content?.trim();
      if (!trimmed) return;
      const sender = isStaff ? 'admin' : 'user';
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender,
            content: trimmed,
          })
          .select('*')
          .single();
        if (error) throw error;
        const hydrated = await hydrateMessage(data);
        setMessages((prev) => sortMessagesAscending([...prev, hydrated]));
        updateConversationFromMessage(hydrated);
      } catch (error) {
        console.error('sendTextMessage failed', error);
        throw new Error("Votre message n'a pas pu etre envoye.");
      }
    },
    [isStaff, selectedConversation?.id, updateConversationFromMessage]
  );

  const sendFileMessage = useCallback(
    async (file) => {
      if (!selectedConversation?.id || !file) return;
      const sender = isStaff ? 'admin' : 'user';
      const fileName = `${uuidv4()}-${file.name}`;
      const guestFolder = selectedConversation.guest_id || guestKey || 'guest';
      const filePath = `${guestFolder}/${fileName}`;
      try {
        const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);

        const content = file.type.startsWith('image/') ? '' : file.name;
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender,
            content,
            file_url: publicUrl,
            file_type: file.type,
          })
          .select('*')
          .single();
        if (error) throw error;
        const hydrated = await hydrateMessage(data);
        setMessages((prev) => sortMessagesAscending([...prev, hydrated]));
        updateConversationFromMessage(hydrated);
      } catch (error) {
        console.error('sendFileMessage failed', error);
        throw new Error("Impossible d'envoyer le fichier.");
      }
    },
    [guestKey, isStaff, selectedConversation?.guest_id, selectedConversation?.id, updateConversationFromMessage]
  );

  const sendResourceMessage = useCallback(
    async (resource) => {
      if (!selectedConversation?.id || !resource) return;
      const sender = isStaff ? 'admin' : 'user';
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: selectedConversation.id,
            sender,
            content: `Ressource partagee : ${resource.name}`,
            resource_id: resource.id,
          })
          .select('*')
          .single();
        if (error) throw error;
        const hydrated = await hydrateMessage(data);
        setMessages((prev) => sortMessagesAscending([...prev, hydrated]));
        updateConversationFromMessage(hydrated);
      } catch (error) {
        console.error('sendResourceMessage failed', error);
        throw new Error("Impossible de partager la ressource.");
      }
    },
    [isStaff, selectedConversation?.id, updateConversationFromMessage]
  );

  const clearConversationHistory = useCallback(
    async () => {
      if (!selectedConversation?.id) return;
      try {
        await supabase.from('chat_messages').delete().eq('conversation_id', selectedConversation.id);
        setMessages([]);
        toast({
          title: 'Conversation videe',
          description: 'Tous les messages ont ete supprimes.',
        });
      } catch (error) {
        console.error('clearConversationHistory failed', error);
        toast({
          title: 'Erreur',
          description: "Impossible de vider la conversation.",
          variant: 'destructive',
        });
      }
    },
    [selectedConversation?.id, toast]
  );

  useEffect(() => {
    if (!selectedConversation?.id || isStaff) return;
    markConversationAsViewed(selectedConversation.id).catch((error) => {
      console.error('markConversationAsViewed initial failed', error);
    });
  }, [isStaff, markConversationAsViewed, selectedConversation?.id]);

  const isConversationLoading = useMemo(() => {
    if (!selectedConversationId) return true;
    if (isLoadingMessages && messages.length === 0) return true;
    return false;
  }, [isLoadingMessages, messages.length, selectedConversationId]);

  const isConversationRefreshing = false;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Live Chat | NotionLab</title>
        <meta name="description" content="Discute en direct avec l'equipe NotionLab." />
      </Helmet>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:gap-6">
        <aside className="md:w-[320px] lg:w-[360px]">
          <div className="sticky top-24 flex h-[calc(100vh-6rem)] flex-col">
            {authLoading || !identifiersReady || isLoadingConversations ? (
              <ConversationsSidebarSkeleton />
            ) : (
              <ConversationsSidebar
                conversations={filteredConversations}
                view={view}
                onViewChange={setView}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversationId}
                onToggleArchive={handleToggleArchive}
                staffRecipients={staffRecipients}
                isLoadingStaffRecipients={isLoadingStaffRecipients}
                onStartConversation={handleStartConversation}
              />
            )}
          </div>
        </aside>

        <main className={cn('flex-1 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm', 'min-h-[70vh]')}>
          {authLoading || !identifiersReady ? (
            <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Chargement du chat...</span>
            </div>
          ) : (
            <ClientConversationView
              conversation={selectedConversation}
              messages={messages}
              isLoading={isConversationLoading}
              isRefreshing={isConversationRefreshing}
              onSendMessage={async (value) => {
                await sendTextMessage(value);
              }}
              onSendFile={async (file) => {
                await sendFileMessage(file);
              }}
              onSendResource={async (resource) => {
                await sendResourceMessage(resource);
              }}
              onClearChat={clearConversationHistory}
              isStaff={isStaff}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default ClientLiveChatPage;
