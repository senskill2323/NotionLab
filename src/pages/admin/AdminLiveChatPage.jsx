import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Inbox } from 'lucide-react';
import ConversationList from '@/components/admin/chat/ConversationList';
import AdminChatView from '@/components/admin/AdminChatView';
import Navigation from '@/components/Navigation';

const AdminLiveChatPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('active'); // 'active' | 'archived'
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from ?? '/admin/dashboard';

  const markViewInFlightRef = useRef(false);

  const markConversationAsViewed = useCallback(async (conversationId) => {
    if (!conversationId) return;
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
      }
    } catch (err) {
      console.error('Unexpected error while marking chat conversation as viewed by admin:', err);
    } finally {
      markViewInFlightRef.current = false;
    }
  }, []);
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'archived') {
        // Fetch archived conversations directly if RPC doesn't include them
        const { data, error } = await supabase
          .from('chat_conversations')
          .select('id, guest_email, updated_at, status, admin_archived')
          .eq('admin_archived', true)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        setConversations(Array.isArray(data) ? data : []);
      } else {
        // Default to existing RPC for active conversations with details/summary
        const { data, error } = await supabase.rpc('get_chat_conversations_with_details');
        if (error) throw error;
        const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        setConversations(sortedData);
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
    if (selectedConversation?.id) {
      markConversationAsViewed(selectedConversation.id);
    }
  }, [selectedConversation?.id, markConversationAsViewed]);


  useEffect(() => {
    const channel = supabase
      .channel('public:chat_live_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        // This makes the UI more responsive by updating the list immediately
        setConversations(prev => {
          const updatedConversations = prev.map(convo => {
            if (convo.id === payload.new.conversation_id) {
              return {
                ...convo,
                summary: payload.new.content?.substring(0, 45),
                updated_at: payload.new.created_at
              };
            }
            return convo;
          });
          // Move updated conversation to top
          return updatedConversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    markConversationAsViewed(conversation?.id);
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setSelectedConversation(null); // reset selection when switching
  };

  return (
    <>
      <Helmet>
        <title>Live Chat | Admin</title>
        <meta name="description" content="Gérez toutes les conversations en temps réel depuis une interface unique." />
      </Helmet>
      <div className='flex flex-col h-screen'>
        <Navigation />
        <div className="flex-grow flex overflow-hidden">
          <aside className="w-full md:w-[320px] lg:w-[350px] flex-shrink-0 border-r bg-card h-[calc(100vh-4rem)]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                view={view}
                onViewChange={handleViewChange}
                onBack={() => navigate(fromPath, { replace: true })}
              />
            )}
          </aside>
          <main className="flex-grow flex flex-col h-[calc(100vh-4rem)]">
            {selectedConversation ? (
              <AdminChatView key={selectedConversation.id} conversation={selectedConversation} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-background">
                <Inbox className="w-20 h-20 mb-4 text-primary/30" />
                <h2 className="text-2xl font-semibold">
                  {view === 'archived' ? 'Conversations archivées' : 'Bienvenue dans le Live Chat'}
                </h2>
                <p>
                  {view === 'archived' ? 'Sélectionnez une conversation archivée pour la consulter.' : 'Sélectionnez une conversation dans la liste pour commencer.'}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminLiveChatPage;





