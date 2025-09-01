import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Send, Bot, User, Loader2, Paperclip, File as FileIcon, Bold, Underline } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import RichTextRenderer from '@/components/RichTextRenderer';
import { motion } from 'framer-motion';

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}
    >
      <div className="w-8 flex-shrink-0">
        {isFirstInGroup && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSenderAdmin ? 'notion-gradient' : 'bg-muted'}`}>
            {isSenderAdmin ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div>
        )}
      </div>
      <div className="flex-grow">
        {isFirstInGroup && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm">
              {isSenderAdmin ? "Vous (Admin)" : (conversation.guest_email || 'Visiteur')}
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
    </motion.div>
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
    setMessages(prev => [...prev, newMessage]);
    return tempId;
  };
  
  const handleSendSuccess = (tempId, insertedMessage) => {
    setMessages(prev => prev.map(msg => msg.id === tempId ? insertedMessage : msg));
  };

  const handleSendError = (tempId, originalContent) => {
     toast({ title: "Erreur", description: "Votre message n'a pas pu être envoyé.", variant: "destructive" });
    if (originalContent) setInput(originalContent);
    setMessages(prev => prev.filter(msg => msg.id !== tempId));
  };


  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversation?.id) {
        setLoading(false);
        setMessages([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        toast({ title: "Erreur", description: "Impossible de charger les messages.", variant: "destructive" });
      } else {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchMessages();
  }, [conversation?.id, toast]);

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!conversation?.id) return;
    const channel = supabase
      .channel(`admin_chat_${conversation.id}`)
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversation?.id) return;

    const messageContent = input;
    setInput('');
    
    const tempId = handleOptimisticSend({
      conversation_id: conversation.id,
      sender: 'admin',
      content: messageContent,
      created_at: new Date().toISOString(),
      file_url: null,
      file_type: null,
    });

    const { data: insertedMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        sender: 'admin',
        content: messageContent,
      })
      .select()
      .single();

    if (error) {
      handleSendError(tempId, messageContent);
    } else {
      handleSendSuccess(tempId, insertedMessage);
    }
  };


  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !conversation?.id) return;

    setUploading(true);
    const fileName = `${uuidv4()}-${file.name}`;
    const filePath = `${conversation.guest_id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);

      const { data: insertedMessage, error: messageError } = await supabase.from('chat_messages').insert({
        conversation_id: conversation.id,
        sender: 'admin',
        content: `Fichier: ${file.name}`,
        file_url: publicUrl,
        file_type: file.type,
      }).select().single();

      if (messageError) throw messageError;

    } catch (error) {
      toast({ title: "Erreur", description: `Échec de l'envoi du fichier: ${error.message}`, variant: "destructive" });
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
                placeholder="Votre réponse..." 
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