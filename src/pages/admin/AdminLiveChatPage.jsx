import React, { useState, useEffect, useCallback } from 'react';
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
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_chat_conversations_with_details');
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les conversations.", variant: "destructive" });
    } else {
      // Sort by last updated
      const sortedData = data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      setConversations(sortedData);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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
                summary: payload.new.content.substring(0, 45),
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
              />
            )}
          </aside>
          <main className="flex-grow flex flex-col h-[calc(100vh-4rem)]">
            {selectedConversation ? (
              <AdminChatView key={selectedConversation.id} conversation={selectedConversation} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-background">
                <Inbox className="w-20 h-20 mb-4 text-primary/30" />
                <h2 className="text-2xl font-semibold">Bienvenue dans le Live Chat</h2>
                <p>Sélectionnez une conversation dans la liste pour commencer.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminLiveChatPage;