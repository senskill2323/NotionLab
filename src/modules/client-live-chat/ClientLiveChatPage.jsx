import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClientLiveChat } from './useClientLiveChat';
import ConversationsSidebar, { ConversationsSidebarSkeleton } from './components/ConversationsSidebar';
import ClientConversationView from './components/ClientConversationView';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const ClientLiveChatPage = () => {
  const { user, authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const conversationParam = searchParams.get('conversation');

  const liveChat = useClientLiveChat({ user, initialConversationId: conversationParam });
  const {
    identifiersReady,
    filteredConversations,
    staffRecipients,
    isLoadingStaffRecipients,
    startConversation,
    view,
    setView,
    searchTerm,
    setSearchTerm,
    selectConversation,
    selectedConversation,
    selectedConversationId,
    isLoadingConversations,
    isFetchingConversations,
    isLoadingMessages,
    messages,
    sendTextMessage,
    sendFileMessage,
    sendResourceMessage,
    clearConversationHistory,
    toggleArchive,
    isStaff,
  } = liveChat;

  useEffect(() => {
    if (!selectedConversationId && conversationParam) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('conversation');
      setSearchParams(nextParams, { replace: true });
    }
    if (selectedConversationId && selectedConversationId !== conversationParam) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('conversation', selectedConversationId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [conversationParam, searchParams, selectedConversationId, setSearchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: 'Authentification requise', description: 'Connecte-toi pour acceder au live chat.', variant: 'destructive' });
    }
  }, [authLoading, toast, user]);


  const handleStartConversation = async (staffUserId) => {
    try {
      if (!staffUserId) {
        toast({ title: 'Destinataire requis', description: 'Choisis un destinataire avant de demarrer.', variant: 'destructive' });
        return;
      }
      const conversation = await startConversation({ staffUserId });
      if (!conversation?.id) {
        toast({ title: 'Conversation indisponible', description: 'Impossible de creer la conversation.', variant: 'destructive' });
      }
    } catch (error) {
      const description = error?.message || 'Impossible de creer la conversation.';
      toast({ title: 'Erreur', description, variant: 'destructive' });
    }
  };

  const isSidebarLoading = authLoading || !identifiersReady || isLoadingConversations;
  const isConversationLoading = (isLoadingMessages && (!messages || messages.length === 0)) || !selectedConversationId;
  const isConversationRefreshing = !isConversationLoading && isFetchingConversations;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Live Chat | NotionLab</title>
        <meta name="description" content="Discute en direct avec l'equipe NotionLab." />
      </Helmet>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:gap-6">
        <aside className="md:w-[320px] lg:w-[360px]">
          <div className="sticky top-24 flex h-[calc(100vh-6rem)] flex-col">
            {isSidebarLoading ? (
              <ConversationsSidebarSkeleton />
            ) : (
              <ConversationsSidebar
                conversations={filteredConversations}
                view={view}
                onViewChange={setView}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSelectConversation={selectConversation}
                selectedConversationId={selectedConversationId}
                onToggleArchive={(conversationId, archived) => toggleArchive(conversationId, archived)}
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
              onSendMessage={sendTextMessage}
              onSendFile={sendFileMessage}
              onSendResource={sendResourceMessage}
              isRefreshing={isConversationRefreshing}
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








