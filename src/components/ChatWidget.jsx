import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
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

  const isClientOrVip = user && (user.profile?.role === 'client' || user.profile?.role === 'vip');

  const resetChatState = () => {
    setMessages([]);
    setConversation(null);
    setInput('');
  };
  
  const handleCloseChat = () => {
    if (messages.length > 0) {
      setShowCloseConfirm(true);
    } else {
      closeChat();
    }
  };

  const confirmCloseChat = async () => {
    if (conversation) {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status: 'abandonne' })
        .eq('id', conversation.id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de fermer la conversation. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }
    }
    
    closeChat();
    setShowCloseConfirm(false);
  };

  useEffect(() => {
    if (user) {
      setGuestId(user.id);
      setGuestName(user.profile?.first_name || '');
    } else {
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
    }
  }, [user]);

  useEffect(() => {
    if (prefilledMessage) {
        setInput(prefilledMessage);
        setPrefilledMessage('');
    }
  }, [prefilledMessage, setPrefilledMessage]);
  
  const getOrCreateConversation = async () => {
    if (!guestId) return;
    if (conversation) return conversation;
  
    let query = supabase.from('chat_conversations').select('*');
    query = query.eq('guest_id', guestId);
    query = query.order('created_at', { ascending: false }).limit(1);
  
    const { data, error } = await query;
  
    if (error) {
      toast({ title: "Erreur", description: "Impossible de récupérer la conversation.", variant: "destructive" });
      return null;
    }
  
    if (data && data.length > 0) {
      const existingConversation = data[0];
      if (existingConversation.status !== 'resolu' && existingConversation.status !== 'abandonne') {
        setConversation(existingConversation);
        const { data: messageData } = await supabase.from('chat_messages').select('*').eq('conversation_id', existingConversation.id).order('created_at');
        setMessages(messageData || []);
        return existingConversation;
      }
    }
    
    return null;
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
        getOrCreateConversation();
    } else if (!isOpen) {
        resetChatState();
    }
  }, [isOpen, isMinimized, guestId]);


  useEffect(() => {
    if (!isOpen || !conversation) return;

    const channel = supabase
      .channel(`chat_${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find(msg => msg.id === payload.new.id)) {
              return prev.map(msg => msg.id === payload.new.id ? payload.new : msg);
            }
            return [...prev, payload.new];
          });
          if (isMinimized) {
            setHasNewMessage(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, conversation, isMinimized]);

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
    if(isOpen && !isMinimized) {
        setHasNewMessage(false);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!guestName.trim() && messages.length === 0) {
      toast({ title: "Attention", description: "Veuillez entrer votre prénom pour commencer le chat.", variant: "default" });
      return;
    }

    if (guestName.trim() && !user) {
      localStorage.setItem('guestName', guestName.trim());
    }

    let currentConversation = conversation;
    if (!currentConversation) {
        const newConvPayload = { 
          guest_id: guestId, 
          guest_email: user ? user.email : `${guestName.trim()}@chat.guest` 
        };

        const { data: newConvData, error: newConvError } = await supabase
          .from('chat_conversations')
          .insert(newConvPayload)
          .select()
          .single();
        
        if (newConvError) {
          toast({ title: "Erreur", description: `Impossible de démarrer le chat: ${newConvError.message}`, variant: "destructive" });
          return;
        }
        currentConversation = newConvData;
        setConversation(currentConversation);
    }

    const messageContent = input;
    setInput('');
    
    const tempId = Date.now();
    const senderName = user ? (user.profile?.first_name || 'guest') : (guestName.trim() || 'guest');
    const newMessage = {
      id: tempId,
      conversation_id: currentConversation.id,
      sender: senderName,
      content: messageContent,
      created_at: new Date().toISOString(),
      file_url: null,
      file_type: null,
    };
    
    setMessages(prev => [...prev, newMessage]);

    const { data: insertedMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: currentConversation.id,
        sender: senderName,
        content: messageContent,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: `Votre message n'a pas pu être envoyé: ${error.message}`, variant: "destructive" });
      setInput(messageContent);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } else {
        setMessages(prev => prev.map(msg => msg.id === tempId ? insertedMessage : msg));
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !conversation) return;

    setUploading(true);
    const fileName = `${uuidv4()}-${file.name}`;
    const filePath = `${guestId}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);

      const senderName = user ? (user.profile?.first_name || 'guest') : (guestName.trim() || 'guest');
      const { error: messageError } = await supabase.from('chat_messages').insert({
        conversation_id: conversation.id,
        sender: senderName,
        content: file.name,
        file_url: publicUrl,
        file_type: file.type,
      });

      if (messageError) throw messageError;

    } catch (error) {
      toast({ title: "Erreur", description: `Échec de l'envoi du fichier: ${error.message}`, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  if (isClientOrVip) return null;

  const widgetClass = isFullScreen
    ? "fixed inset-0 z-50 w-full h-full"
    : "fixed bottom-24 right-5 z-50 w-[380px] h-[500px]";

  const cardClass = isFullScreen
    ? "w-full h-full flex flex-col shadow-2xl bg-background/95 backdrop-blur-sm"
    : "w-full h-full flex flex-col shadow-2xl glass-effect";

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
  const groupedMessages = useMemo(() => groupMessagesByMinute(messages), [messages]);
