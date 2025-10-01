import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useClientChatIndicator } from '@/hooks/useClientChatIndicator.jsx';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import CloseConfirmDialog from '@/components/chat/CloseConfirmDialog';
import { groupMessagesByMinute } from '@/lib/chatUtils';
import {
  ensureClientConversation,
  fetchMessages,
  resolveClientConversation,
  sendFile,
  sendMessage,
  subscribeToClientChatMessages,
} from '@/lib/chatApi';

const sortMessagesByCreatedAt = (list) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime());
};

const ChatWidget = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [guestId, setGuestId] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [conversation, setConversation] = useState(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { markAsRead } = useClientChatIndicator();
  const { isOpen, isMinimized, closeChat, minimizeChat, toggleChat, prefilledMessage, setPrefilledMessage } = useChat();

  const messagesSubscriptionRef = useRef(null);
  const lastLoadedConversationIdRef = useRef(null);

  const isClientOrVip = user && (user.profile?.role === 'client' || user.profile?.role === 'vip');

  const groupedMessages = useMemo(() => groupMessagesByMinute(messages), [messages]);

  const resetChatState = useCallback(() => {
    messagesSubscriptionRef.current?.unsubscribe?.();
    messagesSubscriptionRef.current = null;
    lastLoadedConversationIdRef.current = null;
    setMessages([]);
    setConversation(null);
    setInput('');
  }, []);

  useEffect(() => {
    if (user) {
      setGuestId(user.id);
      setGuestName(user.profile?.first_name || '');
      return;
    }

    let id = localStorage.getItem('guestId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('guestId', id);
    }
    setGuestId(id);

    const storedGuestName = localStorage.getItem('guestName');
    if (storedGuestName) {
      setGuestName(storedGuestName);
    }
  }, [user]);

  useEffect(() => {
    if (prefilledMessage) {
      setInput(prefilledMessage);
      setPrefilledMessage('');
    }
  }, [prefilledMessage, setPrefilledMessage]);

  const ensureConversation = useCallback(
    async ({ reloadMessages = true } = {}) => {
      if (!guestId && !user?.email) {
        return null;
      }

      try {
        const record = await ensureClientConversation({
          guestId: guestId || null,
          guestEmail: user?.email || null,
          guestName,
        });

        if (!record?.id) {
          return null;
        }

        setConversation(record);

        if (reloadMessages && lastLoadedConversationIdRef.current !== record.id) {
          const data = await fetchMessages(record.id);
          setMessages(sortMessagesByCreatedAt(Array.isArray(data) ? data : []));
        }

        lastLoadedConversationIdRef.current = record.id;
        return record;
      } catch (error) {
        console.error('chat widget ensure conversation failed', error);
        toast({
          title: 'Erreur',
          description: error?.message || "Impossible de recuperer la conversation.",
          variant: 'destructive',
        });
        return null;
      }
    },
    [guestId, guestName, toast, user?.email]
  );

  useEffect(() => {
    if (isOpen && !isMinimized) {
      ensureConversation();
    } else if (!isOpen) {
      resetChatState();
    }
  }, [ensureConversation, isMinimized, isOpen, resetChatState]);

  useEffect(() => {
    const conversationId = conversation?.id;
    if (!conversationId) {
      return undefined;
    }

    const subscription = subscribeToClientChatMessages(
      conversationId,
      (payload) => {
        if (!payload) {
          return;
        }

        const { eventType, new: newMessage, old: previous } = payload;

        if (eventType === 'DELETE' && previous?.id) {
          setMessages((prev) => (Array.isArray(prev) ? prev.filter((msg) => msg.id !== previous.id) : prev));
          return;
        }

        if (!newMessage?.id) {
          return;
        }

        setConversation((prev) =>
          prev?.id === newMessage.conversation_id
            ? { ...prev, updated_at: newMessage.created_at || prev.updated_at }
            : prev
        );

        setMessages((prev) => {
          const next = Array.isArray(prev) ? [...prev] : [];
          const index = next.findIndex((msg) => msg.id === newMessage.id);
          if (index >= 0) {
            next[index] = { ...next[index], ...newMessage };
          } else {
            next.push(newMessage);
          }
          return sortMessagesByCreatedAt(next);
        });

        if (isMinimized || !isOpen) {
          setHasNewMessage(true);
        }
      },
      {
        onFallback: async () => {
          try {
            const data = await fetchMessages(conversationId);
            setMessages(sortMessagesByCreatedAt(Array.isArray(data) ? data : []));
          } catch (error) {
            console.error('chat widget message fallback failed', { conversationId, error });
          }
        },
      }
    );

    messagesSubscriptionRef.current = subscription;

    return () => {
      subscription?.unsubscribe?.();
      if (messagesSubscriptionRef.current === subscription) {
        messagesSubscriptionRef.current = null;
      }
    };
  }, [conversation?.id, isMinimized, isOpen]);

  useEffect(() => {
    if (!conversation?.id) return;
    if (!isOpen || isMinimized) return;

    markAsRead(conversation.id).catch((error) => {
      console.error('Failed to mark widget chat as viewed:', error);
    });
  }, [conversation?.id, isMinimized, isOpen, markAsRead]);

  useEffect(() => {
    if (!conversation?.id) return;
    if (!isOpen || isMinimized) return;
    if (!messages || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.sender !== 'admin') return;

    markAsRead(conversation.id).catch((error) => {
      console.error('Failed to refresh widget chat read status after admin message:', error);
    });
  }, [conversation?.id, isMinimized, isOpen, markAsRead, messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setHasNewMessage(false);
    }
  }, [isOpen, isMinimized]);

  const handleCloseChat = () => {
    if (messages.length > 0) {
      setShowCloseConfirm(true);
    } else {
      closeChat();
    }
  };

  const confirmCloseChat = async () => {
    if (conversation?.id) {
      try {
        const updated = await resolveClientConversation(conversation.id);
        setConversation(updated);
      } catch (error) {
        toast({
          title: 'Erreur',
          description: error?.message || "Impossible de fermer la conversation.",
          variant: 'destructive',
        });
        return;
      }
    }

    closeChat();
    setShowCloseConfirm(false);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (!guestName.trim() && messages.length === 0 && !user) {
      toast({
        title: 'Attention',
        description: 'Veuillez entrer votre prenom pour commencer le chat.',
        variant: 'default',
      });
      return;
    }

    if (guestName.trim() && !user) {
      localStorage.setItem('guestName', guestName.trim());
    }

    let currentConversation = conversation;
    if (!currentConversation) {
      currentConversation = await ensureConversation({ reloadMessages: false });
      if (!currentConversation) {
        return;
      }
    }

    setInput('');

    const tempId = Date.now();
    const optimisticMessage = {
      id: tempId,
      conversation_id: currentConversation.id,
      sender: 'user',
      content: trimmedInput,
      created_at: new Date().toISOString(),
      file_url: null,
      file_type: null,
    };

    setMessages((prev) => sortMessagesByCreatedAt([...(Array.isArray(prev) ? prev : []), optimisticMessage]));

    try {
      const sentMessage = await sendMessage(currentConversation.id, trimmedInput, false);
      setMessages((prev) =>
        sortMessagesByCreatedAt(prev.map((msg) => (msg.id === tempId ? sentMessage : msg)))
      );
    } catch (error) {
      toast({
        title: 'Erreur',
        description: `Votre message n'a pas pu etre envoye: ${error?.message || 'Erreur inattendue.'}`,
        variant: 'destructive',
      });
      setInput(trimmedInput);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let currentConversation = conversation;
    if (!currentConversation) {
      currentConversation = await ensureConversation();
      if (!currentConversation) {
        event.target.value = null;
        return;
      }
    }

    setUploading(true);

    try {
      const message = await sendFile(file, currentConversation, false);
      setMessages((prev) => sortMessagesByCreatedAt([...(Array.isArray(prev) ? prev : []), message]));
    } catch (error) {
      toast({
        title: 'Erreur',
        description: `Echec de l'envoi du fichier: ${error?.message || 'Erreur inattendue.'}`,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

  if (isClientOrVip) return null;

  const widgetClass = isFullScreen
    ? 'fixed inset-0 z-50 w-full h-full'
    : 'fixed bottom-24 right-5 z-50 w-[380px] h-[500px]';

  const cardClass = isFullScreen
    ? 'w-full h-full flex flex-col shadow-2xl bg-background/95 backdrop-blur-sm'
    : 'w-full h-full flex flex-col shadow-2xl glass-effect';

  return (
    <>
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={widgetClass}
          >
            <Card className={cardClass}>
              <ChatHeader
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
                onMinimize={minimizeChat}
                onClose={handleCloseChat}
              />
              <MessageList onMouseUp={() => {}}>
                {groupedMessages.map((group) => (
                  <MessageList.Item key={group.id || group.messages[0]?.id} message={group} user={user} />
                ))}
              </MessageList>
              <MessageInput
                input={input}
                setInput={setInput}
                handleSendMessage={handleSendMessage}
                handleFileSelect={handleFileSelect}
                uploading={uploading}
                disabled={!guestName.trim() && !conversation && !user}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <CloseConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        onConfirm={confirmCloseChat}
      />

      <Button
        className="fixed bottom-5 right-5 z-50 rounded-full w-14 h-14 notion-gradient text-white shadow-lg pulse-glow"
        onClick={toggleChat}
      >
        {hasNewMessage && (
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background"
          />
        )}
        {isOpen && !isMinimized ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </>
  );
};

export default ChatWidget;
