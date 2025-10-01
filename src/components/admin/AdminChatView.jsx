import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { fetchMessages, sendFile, sendMessage, subscribeToAdminChatMessages } from '@/lib/chatApi';
import { Send, Bot, User, Loader2, Paperclip, File as FileIcon, Bold, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';
import RichTextRenderer from '@/components/RichTextRenderer';

const sortMessagesByCreatedAt = (list) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime());
};

const CompactChatMessage = ({ message, conversation, isFirstInGroup }) => {
  const isSenderAdmin = message.sender === 'admin';

  const renderMessageContent = (msg) => {
    if (msg.file_url) {
      if (msg.file_type?.startsWith('image/')) {
        return (
          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block mt-1">
            <img src={msg.file_url} alt={msg.content || 'Image jointe'} className="max-w-[250px] rounded-lg my-1" />
            {msg.content && <RichTextRenderer content={msg.content} />}
          </a>
        );
      }
      return (
        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline text-primary mt-1">
          <FileIcon className="w-4 h-4" />
          <span>{msg.content || 'Fichier joint'}</span>
        </a>
      );
    }
    return <RichTextRenderer content={msg.content} />;
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isFirstInGroup ? 'mt-4' : 'mt-1',
        'animate-in fade-in slide-in-from-bottom-1'
      )}
    >
      <div className="w-8 flex-shrink-0">
        {isFirstInGroup && (
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback
              className={cn(
                'flex h-full w-full items-center justify-center rounded-full',
                isSenderAdmin ? 'notion-gradient text-white' : 'bg-muted text-muted-foreground'
              )}
            >
              {isSenderAdmin ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className="flex-grow">
        {isFirstInGroup && (
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold">
              {isSenderAdmin ? 'Vous (Admin)' : conversation.guest_email || 'Visiteur'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        <div className="text-sm text-foreground/90">
          {renderMessageContent(message)}
        </div>
      </div>
    </div>
  );
};

const AdminChatView = ({ conversation }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleOptimisticSend = (newMessageData) => {
    const tempId = Date.now();
    const newMessage = {
      id: tempId,
      ...newMessageData,
    };
    setMessages((prev) => sortMessagesByCreatedAt([...prev, newMessage]));
    return tempId;
  };
  
  const handleSendSuccess = (tempId, insertedMessage) => {
    setMessages((prev) => sortMessagesByCreatedAt(prev.map((msg) => (msg.id === tempId ? insertedMessage : msg))));
  };

  const handleSendError = (tempId, originalContent) => {
     toast({ title: "Erreur", description: "Votre message n'a pas pu etre envoye.", variant: "destructive" });
    if (originalContent) setInput(originalContent);
    setMessages(prev => prev.filter(msg => msg.id !== tempId));
  };


  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation?.id) {
        setLoading(false);
        setMessages([]);
        return;
      }

      setLoading(true);

      try {
        const data = await fetchMessages(conversation.id);
        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de charger les messages.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [conversation?.id, toast]);

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!conversation?.id) return undefined;

    const subscription = subscribeToAdminChatMessages(
      conversation.id,
      (payload) => {
        if (!payload) return;
        const { eventType, new: newMessage, old: previous } = payload;
        if (eventType === 'DELETE' && previous?.id) {
          setMessages((prev) => (Array.isArray(prev) ? prev.filter((msg) => msg.id !== previous.id) : prev));
          return;
        }
        if (!newMessage?.id || newMessage.conversation_id !== conversation.id) {
          return;
        }

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
      },
      {
        onFallback: async () => {
          try {
            const data = await fetchMessages(conversation.id);
            setMessages(Array.isArray(data) ? data : []);
          } catch (error) {
            console.error('admin chat view message fallback failed', { conversationId: conversation.id, error });
          }
        },
      }
    );

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [conversation?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!conversation?.id) return;
    const trimmedContent = input.trim();
    if (!trimmedContent) return;

    setInput('');

    const tempId = handleOptimisticSend({
      conversation_id: conversation.id,
      sender: 'admin',
      content: trimmedContent,
      created_at: new Date().toISOString(),
      file_url: null,
      file_type: null,
    });

    try {
      const insertedMessage = await sendMessage(conversation.id, trimmedContent, true);
      handleSendSuccess(tempId, insertedMessage);
    } catch (error) {
      handleSendError(tempId, trimmedContent);
    }
  };


  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !conversation?.id) return;

    setUploading(true);

    try {
      const message = await sendFile(file, conversation, true);
      setMessages((prev) => sortMessagesByCreatedAt([...(Array.isArray(prev) ? prev : []), message]));
    } catch (error) {
      toast({ title: "Erreur", description: `Echec de l'envoi du fichier: ${error?.message || 'Erreur inattendue.'}`, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const applyFormatting = (syntax) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = input.substring(start, end);
    const newText = `${input.substring(0, start)}${syntax}${selectedText}${syntax}${input.substring(end)}`;
    
    setInput(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + syntax.length;
      textarea.selectionEnd = end + syntax.length;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-grow bg-background">
      <div className="flex-grow overflow-y-auto p-4">
        <div className="space-y-2">
          {messages.map((message, index) => {
            const prevMessage = messages[index - 1];
            const isFirstInGroup = !prevMessage || prevMessage.sender !== message.sender;
            return (
              <CompactChatMessage 
                key={message.id} 
                message={message} 
                conversation={conversation}
                isFirstInGroup={isFirstInGroup}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t bg-card">
         <div className="p-2 border rounded-lg bg-background">
            <div className="flex items-center gap-1 p-1 border-b mb-2">
            <Button type="button" variant="ghost" size="icon" onClick={() => applyFormatting('**')} className="h-6 w-6">
                <Bold className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => applyFormatting('_')} className="h-6 w-6">
                <Underline className="w-4 h-4" />
            </Button>
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2 items-start">
            
            <Textarea 
                ref={textareaRef}
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Votre reponse..." 
                className="flex-grow resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" 
                rows={2}
                disabled={uploading}
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                }
                }}
            />
             <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
            <Button type="submit" className="notion-gradient text-white" size="icon" disabled={!input.trim() || uploading}><Send className="w-4 h-4" /></Button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/jpeg,image/png,image/gif,application/pdf,application/zip,text/plain" />
            </form>
         </div>
      </div>
    </div>
  );
};

export default AdminChatView;

