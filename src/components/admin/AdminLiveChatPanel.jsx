import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import ConversationList from '@/components/admin/chat/ConversationList';
import AdminChatView from '@/components/admin/AdminChatView';
import { cn } from '@/lib/utils';

/**
 * @param {Object} props
 * @param {'active' | 'archived'} [props.initialView='active'] Initial view to render.
 * @param {string} [props.initialConversationId] Conversation id to open automatically if available.
 * @param {() => void} [props.onActivityCleared] Callback fired after marking messages as read.
 * @param {boolean} [props.disableAutoMarkViewed=false] Disable automatic marking of conversations as read.
 * @param {(conversation: object | null) => void} [props.onConversationSelected] Callback fired when the active conversation changes.
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
const AdminLiveChatPanel = ({
  initialView = 'active',
  initialConversationId,
  onActivityCleared,
  disableAutoMarkViewed = false,
  onConversationSelected,
  className,
  style,
}) => {
  const onActivityClearedRef = useRef(onActivityCleared);

  useEffect(() => {
    onActivityClearedRef.current = onActivityCleared;
  }, [onActivityCleared]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(initialView);
  const markViewInFlightRef = useRef(false);
  const hasAutoSelectedRef = useRef(false);
  const { toast } = useToast();

  const sortedConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return [...conversations].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }, [conversations]);

  const markConversationAsViewed = useCallback(async (conversationId) => {
    if (!conversationId || disableAutoMarkViewed) return;
    if (markViewInFlightRef.current) return;

    markViewInFlightRef.current = true;
    const nowIso = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ admin_last_viewed_at: nowIso })
        .eq('id', conversationId);

      if (error) {
        console.error('Error marking chat conversation as viewed by admin:', error);
      } else {
        onActivityClearedRef.current?.();
      }
    } catch (err) {
      console.error('Unexpected error while marking chat conversation as viewed by admin:', err);
    } finally {
      markViewInFlightRef.current = false;
    }
  }, [disableAutoMarkViewed]);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'archived') {
        const { data, error } = await supabase
          .from('chat_conversations')
          .select('id, guest_email, updated_at, status, admin_archived')
          .eq('admin_archived', true)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setConversations(Array.isArray(data) ? data : []);
      } else {
        const { data, error } = await supabase.rpc('get_chat_conversations_with_details');
        if (error) throw error;
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('fetchConversations failed:', err);
      toast({ title: 'Erreur', description: "Impossible de charger les conversations.", variant: 'destructive' });
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [toast, view]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!initialConversationId || hasAutoSelectedRef.current) return;
    const match = sortedConversations.find((conversation) => conversation.id === initialConversationId);
    if (match) {
      setSelectedConversation(match);
      hasAutoSelectedRef.current = true;
    }
  }, [initialConversationId, sortedConversations]);

  useEffect(() => {
    if (selectedConversation?.id) {
      onConversationSelected?.(selectedConversation);
      markConversationAsViewed(selectedConversation.id);
    } else {
      onConversationSelected?.(null);
    }
  }, [selectedConversation, markConversationAsViewed, onConversationSelected]);

  useEffect(() => {
    const channel = supabase
      .channel('public:chat_live_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setConversations((prev) => {
          const updated = prev.map((conversation) => {
            if (conversation.id === payload.new.conversation_id) {
              return {
                ...conversation,
                summary: payload.new.content?.substring(0, 45),
                updated_at: payload.new.created_at,
              };
            }
            return conversation;
          });
          return updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const handleSelectConversation = useCallback((conversation) => {
    setSelectedConversation(conversation);
    if (!disableAutoMarkViewed && conversation?.id) {
      markConversationAsViewed(conversation.id);
    }
  }, [disableAutoMarkViewed, markConversationAsViewed]);

  const handleViewChange = useCallback((nextView) => {
    setView(nextView);
    setSelectedConversation(null);
    if (nextView === 'archived') {
      hasAutoSelectedRef.current = false;
    }
  }, []);

  return (
    <div className={cn('flex h-full min-h-0', className)} style={style}>
      <aside className="w-full md:w-[320px] lg:w-[350px] flex-shrink-0 border-r bg-card overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ConversationList
            conversations={sortedConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            view={view}
            onViewChange={handleViewChange}
          />
        )}
      </aside>
      <main className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
        {selectedConversation ? (
          <AdminChatView key={selectedConversation.id} conversation={selectedConversation} />
        ) : (
          <div className="flex flex-col items-center justify-center flex-grow text-center text-muted-foreground bg-background">
            <Inbox className="w-20 h-20 mb-4 text-primary/30" />
            <h2 className="text-2xl font-semibold">
              {view === 'archived' ? 'Conversations archivées' : 'Bienvenue dans le Live Chat'}
            </h2>
            <p>
              {view === 'archived'
                ? 'Sélectionnez une conversation archivée pour la consulter.'
                : 'Sélectionnez une conversation dans la liste pour commencer.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLiveChatPanel;


