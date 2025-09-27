import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useClientChatIndicator } from '@/hooks/useClientChatIndicator.jsx';
import { getOrCreateConversation, fetchMessages, sendMessage, sendFile, sendResource, clearChatHistory } from '@/lib/chatApi';
import { groupMessagesByMinute } from '@/lib/chatUtils';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import TextSelectionMenu from '@/components/chat/TextSelectionMenu';
import { useResourceCreation } from '@/contexts/ResourceCreationContext';
import { Loader2, Info } from 'lucide-react';

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
        toast({ title: "Erreur d'initialisation", description: error.message, variant: "destructive" });
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
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.sender !== 'admin') return;
    markAsRead(conversation.id).catch((error) => {
      console.error('Failed to refresh chat read status after admin message:', error);
    });
  }, [conversation?.id, isAdmin, markAsRead, messages]);

  const handleSendMessage = async (input) => {
    if (!input.trim() || !conversation) return;
    try {
      await sendMessage(conversation.id, input, isAdmin);
    } catch (error) {
      toast({ title: "Erreur d'envoi", description: error.message, variant: "destructive" });
    }
  };

  const handleFileSelect = async (file) => {
    if (!file || !conversation) return;
    try {
      await sendFile(file, conversation, isAdmin);
    } catch (error) {
      toast({ title: "Erreur d'envoi du fichier", description: error.message, variant: "destructive" });
    }
  };

  const handleSelectResource = async (resource) => {
    if (!resource || !conversation) return;
    try {
      await sendResource(resource, conversation.id, isAdmin);
    } catch (error) {
      toast({ title: "Erreur de partage", description: error.message, variant: "destructive" });
    }
  };

  const handleClearChat = async () => {
    if (!conversation) return;
    try {
      await clearChatHistory(conversation.id);
      setMessages([]);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de vider le chat.", variant: "destructive" });
    }
  };

  const getFormattedSelection = (selection) => {
    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    const bubbles = new Set();
    
    let currentNode = range.startContainer;
    let endNode = range.endContainer;

    const findParentBubble = (node) => node.nodeType === 1 ? node.closest('.message-bubble') : node.parentElement.closest('.message-bubble');

    let startBubble = findParentBubble(currentNode);
    let endBubble = findParentBubble(endNode);

    if (startBubble) bubbles.add(startBubble);
    if (endBubble) bubbles.add(endBubble);

    Array.from(fragment.querySelectorAll('.message-bubble')).forEach(bubble => bubbles.add(bubble));
    
    const allBubbles = Array.from(document.querySelectorAll('.message-bubble'));
    const intersectingBubbles = allBubbles.filter(bubble => range.intersectsNode(bubble));

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
            return `${author}:\n${bubbleText.trim()}`;
        }).join('\n\n');
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
      toast({ title: "Copié !", description: "Le texte a été copié dans le presse-papiers." });
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

  return (
    <>
      <Helmet>
        <title>Le Chat | NotionLab</title>
        <meta name="description" content="Discutez en direct avec votre formateur Notion." />
        <link rel="icon" type="image/png" href="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/78b000f735753ad0c3a19a5789970ddc.png" />
      </Helmet>
      
      <div className="h-screen flex flex-col overflow-hidden text-foreground" style={{ backgroundColor: 'hsl(var(--colors-chat-surface))' }}>
        <ChatHeader messages={messages} user={user} />

        <main
          className="flex-grow flex flex-col w-full pt-16 pb-24 overflow-hidden min-h-0"
          style={{ backgroundColor: 'hsl(var(--colors-chat-surface))' }}
        >
          <MessageList onMouseUp={handleMouseUp}>
            {loading ? (
              <div className="flex items-center justify-center h-full pt-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : groupedMessages.length > 0 ? (
              groupedMessages.map(group => (
                <MessageList.Item key={group.id || group.messages[0]?.id} message={group} user={user} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full pt-10 text-center text-muted-foreground">
                 <Info className="w-12 h-12 mb-4" />
                 <p className="font-semibold">C'est le début de votre conversation.</p>
                 <p>N'hésitez pas à poser une question !</p>
              </div>
            )}
          </MessageList>
        </main>
          
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
        />
      </div>
    </>
  );
};

export default ChatPage;
