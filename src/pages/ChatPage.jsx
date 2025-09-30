import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useClientChatIndicator } from '@/hooks/useClientChatIndicator.jsx';
import {
  getOrCreateConversation,
  fetchMessages,
  sendMessage,
  sendFile,
  sendResource,
  clearChatHistory,
} from '@/lib/chatApi';
import { groupMessagesByMinute } from '@/lib/chatUtils';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import TextSelectionMenu from '@/components/chat/TextSelectionMenu';
import { useResourceCreation } from '@/contexts/ResourceCreationContext';
import { Loader2, Info, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const STATUS_CONFIG = {
  a_traiter: { label: 'A traiter', variant: 'destructive' },
  en_cours: { label: 'En cours', variant: 'default' },
  resolu: { label: 'Resolu', variant: 'secondary' },
  abandonne: { label: 'Abandonne', variant: 'outline' },
  ouvert: { label: 'Ouvert', variant: 'default' },
};

const STAFF_ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  prof: 'Prof',
};

const formatDateTime = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_err) {
    return value;
  }
};

const ChatPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { markAsRead } = useClientChatIndicator();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectionState, setSelectionState] = useState(null);
  const { openResourceDialog } = useResourceCreation();
  const isAdmin = user && ['admin', 'prof', 'owner'].includes(user.profile?.user_type);

  const groupedMessages = useMemo(() => groupMessagesByMinute(messages), [messages]);

  const latestMessage = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) return null;
    return messages[messages.length - 1];
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const conv = await getOrCreateConversation(user);
        if (conv) {
          setConversation(conv);
          const initialMessages = await fetchMessages(conv.id);
          setMessages(initialMessages);
        }
      } catch (error) {
        toast({ title: "Erreur d'initialisation", description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    initializeChat();
  }, [user, toast]);

  useEffect(() => {
    if (!conversation) return;

    const handleNewMessage = (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    const channel = getOrCreateConversation.subscribeToMessages(conversation.id, handleNewMessage);

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [conversation]);

  useEffect(() => {
    if (!conversation?.id || isAdmin) return;
    markAsRead(conversation.id).catch((error) => {
      console.error('Failed to mark chat conversation as viewed by client:', error);
    });
  }, [conversation?.id, isAdmin, markAsRead]);

  useEffect(() => {
    if (!conversation?.id || isAdmin) return;
    if (!messages || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest?.sender !== 'admin') return;
    markAsRead(conversation.id).catch((error) => {
      console.error('Failed to refresh chat read status after admin message:', error);
    });
  }, [conversation?.id, isAdmin, markAsRead, messages]);

  const handleSendMessage = async (input) => {
    if (!input.trim() || !conversation) return;
    try {
      await sendMessage(conversation.id, input, isAdmin);
    } catch (error) {
      toast({ title: "Erreur d'envoi", description: error.message, variant: 'destructive' });
    }
  };

  const handleFileSelect = async (file) => {
    if (!file || !conversation) return;
    try {
      await sendFile(file, conversation, isAdmin);
    } catch (error) {
      toast({ title: "Erreur d'envoi du fichier", description: error.message, variant: 'destructive' });
    }
  };

  const handleSelectResource = async (resource) => {
    if (!resource || !conversation) return;
    try {
      await sendResource(resource, conversation.id, isAdmin);
    } catch (error) {
      toast({ title: "Erreur de partage", description: error.message, variant: 'destructive' });
    }
  };

  const handleClearChat = async () => {
    if (!conversation) return;
    try {
      await clearChatHistory(conversation.id);
      setMessages([]);
    } catch (error) {
      toast({ title: 'Erreur', description: "Impossible de vider le chat.", variant: 'destructive' });
    }
  };

  const getFormattedSelection = (selection) => {
    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    const bubbles = new Set();

    let currentNode = range.startContainer;
    let endNode = range.endContainer;

    const findParentBubble = (node) => node.nodeType === 1 ? node.closest('.message-bubble') : node.parentElement.closest('.message-bubble');

    const startBubble = findParentBubble(range.startContainer);
    const endBubble = findParentBubble(range.endContainer);

    if (startBubble) bubbles.add(startBubble);
    if (endBubble) bubbles.add(endBubble);

    fragment.querySelectorAll?.('.message-bubble')?.forEach?.((bubble) => bubbles.add(bubble));

    const allBubbles = Array.from(document.querySelectorAll('.message-bubble'));
    const intersectingBubbles = allBubbles.filter((bubble) => {
      try {
        return range.intersectsNode(bubble);
      } catch (_err) {
        return false;
      }
    });

    const uniqueBubbles = [...new Set([...bubbles, ...intersectingBubbles])];
    if (uniqueBubbles.length <= 1) {
        return selection.toString();
    }

    return uniqueBubbles
        .sort((a, b) => allBubbles.indexOf(a) - allBubbles.indexOf(b))
        .map(bubble => {
            const author = bubble.dataset.author || 'Anonyme';
            const contentNode = bubble.querySelector('.message-content');
            const selectionWithinBubble = window.getSelection();
            selectionWithinBubble.selectAllChildren(contentNode);
            const bubbleText = selectionWithinBubble.toString();
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            return `${author}:
${bubbleText.trim()}`;
        }).join('

');
  };

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const selectedText = selection.toString().trim();

    if (selectedText) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const formattedText = getFormattedSelection(selection);
      
      setSelectionState({
        rawText: selectedText,
        formattedText: formattedText,
        position: {
          top: rect.top + window.scrollY - 50,
          left: rect.left + window.scrollX + rect.width / 2,
        },
      });
    } else {
      setSelectionState(null);
    }
  }, []);

  const handleCopy = () => {
    if (selectionState) {
      navigator.clipboard.writeText(selectionState.rawText);
      toast({ title: 'Copie !', description: 'Le texte a ete copie dans le presse-papiers.' });
      setSelectionState(null);
    }
  };

  const handleCreateResource = () => {
    if (selectionState) {
      openResourceDialog({
        content: selectionState.formattedText,
        type: 'Note',
        format: 'internal_note',
      });
      setSelectionState(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (selectionState && !event.target.closest('.message-bubble')) {
            const selection = window.getSelection();
            if (selection.isCollapsed) {
                setSelectionState(null);
            }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectionState]);

  const statusConfig = STATUS_CONFIG[conversation?.status] || STATUS_CONFIG.ouvert;
  const staffRole = conversation?.staff_user_type ? STAFF_ROLE_LABELS[conversation.staff_user_type] || conversation.staff_user_type : null;
  const staffName = conversation ? `${conversation.staff_first_name || ''} ${conversation.staff_last_name || ''}`.trim() : '';
  const displayStaffName = staffName || 'Equipe NotionLab';
  const lastUpdated = formatDateTime(latestMessage?.created_at || conversation?.updated_at);
  const lastMessagePreview = latestMessage?.content || latestMessage?.file_url || '';

  const renderSidebarContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-16 rounded-xl border border-border/40 bg-muted/40 animate-pulse" />
          <div className="h-20 rounded-xl border border-border/40 bg-muted/40 animate-pulse" />
        </div>
      );
    }

    if (!conversation) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-6 w-6" />
          <p>Aucune conversation active pour le moment.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversation active</p>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{displayStaffName}</p>
                {staffRole && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{staffRole}</p>}
              </div>
              <Badge variant={statusConfig.variant} className="text-2xs uppercase tracking-wide">
                {statusConfig.label}
              </Badge>
            </div>
            <Separator className="my-4" />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Dernier message</dt>
                <dd className="font-medium text-right">{lastUpdated || '...'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Conversation ID</dt>
                <dd className="text-xs font-mono text-muted-foreground">{conversation.id.slice(0, 12)}...</dd>
              </div>
            </dl>
            {lastMessagePreview && (
              <div className="mt-4 rounded-lg border border-border/40 bg-background/80 p-3 text-xs text-muted-foreground line-clamp-3">
                {lastMessagePreview}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
          <p>
            Rappel : tu peux selectionner un passage du chat pour le copier ou le sauvegarder en ressource directement depuis le menu contextuel.
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Le Chat | NotionLab</title>
        <meta name="description" content="Discutez en direct avec votre formateur Notion." />
      </Helmet>

      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="hidden lg:flex lg:w-[320px] xl:w-[360px] flex-col border-r border-border/60 bg-card/40">
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="border-b border-border/60 px-6 py-5">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <p className="text-sm text-muted-foreground">Accede rapidement a ton echange en cours.</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-6 py-6">
                {renderSidebarContent()}
              </div>
            </ScrollArea>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <ChatHeader messages={messages} user={user} />

          <div className="border-b border-border/60 bg-background/80 px-4 py-4 lg:hidden">
            {loading ? (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
              </div>
            ) : conversation ? (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold leading-snug">{displayStaffName}</p>
                  {staffRole && <p className="text-xs uppercase tracking-wide text-muted-foreground">{staffRole}</p>}
                  {lastUpdated && <p className="text-xs text-muted-foreground">Mis a jour {lastUpdated}</p>}
                </div>
                <Badge variant={statusConfig.variant} className="text-2xs uppercase tracking-wide">
                  {statusConfig.label}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune conversation active.</p>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 min-h-0 flex-col bg-background">
              <div className="flex-1 min-h-0 overflow-hidden">
                <MessageList onMouseUp={handleMouseUp}>
                  {loading ? (
                    <div className="flex h-full items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : groupedMessages.length > 0 ? (
                    groupedMessages.map((group) => (
                      <MessageList.Item key={group.id || group.messages[0]?.id} message={group} user={user} />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                      <Info className="h-12 w-12" />
                      <p className="font-semibold">C'est le debut de votre conversation.</p>
                      <p>N'hesite pas a poser une question !</p>
                    </div>
                  )}
                </MessageList>
              </div>

              <TextSelectionMenu
                position={selectionState?.position}
                onCopy={handleCopy}
                onCreateResource={handleCreateResource}
              />

              <ChatInput
                onSendMessage={handleSendMessage}
                onFileSelect={handleFileSelect}
                onSelectResource={handleSelectResource}
                onClearChat={handleClearChat}
                isAdmin={isAdmin}
                className="border-t border-border/60 bg-card/70 px-4 pb-4 pt-3"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPage;
