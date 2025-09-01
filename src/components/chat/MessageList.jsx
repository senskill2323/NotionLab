import React, { useRef, useEffect } from 'react';
    import { ScrollArea } from '@/components/ui/scroll-area';
    import { Paperclip, BookOpen } from 'lucide-react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { cn } from '@/lib/utils';
    import ReactMarkdown from 'react-markdown';
    import remarkGfm from 'remark-gfm';

    const MessageItem = ({ message, user }) => {
      const isProf = ['admin', 'prof', 'owner'].includes(message.sender);
      const isUser = !isProf;
      const senderName = isProf ? 'NotionLab' : (user?.profile?.first_name || 'Vous');

      const bubbleClasses = cn(
        "message-bubble p-3 rounded-lg max-w-md md:max-w-lg lg:max-w-2xl break-words relative",
        isUser ? "bg-primary/10 text-foreground rounded-br-none self-end" : "bg-muted text-foreground rounded-bl-none self-start"
      );

      return (
        <div 
          className={cn("flex flex-col w-full my-2", isUser ? "items-end" : "items-start")}
          data-author={senderName}
        >
          <div className={bubbleClasses}>
            <div className="flex justify-between items-center mb-1">
              <p className={`font-semibold text-sm ${isProf ? 'text-primary' : 'text-foreground'}`}>{senderName}</p>
              <p className="text-xs text-muted-foreground ml-4">
                {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="text-sm space-y-2 message-content">
              {message.file_url && message.file_type?.startsWith('image/') ? (
                <a href={message.file_url} target="_blank" rel="noopener noreferrer">
                  <img src={message.file_url} alt="Image jointe" className="max-w-xs rounded-md my-1 border" />
                </a>
              ) : message.file_url ? (
                <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> {message.content || 'Fichier joint'}
                </a>
              ) : null}
              {message.resource && (
                <a 
                  href={message.resource.url || (message.resource.file_path ? supabase.storage.from('resources').getPublicUrl(message.resource.file_path).data.publicUrl : '#')}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-2 bg-primary/10 p-2 rounded-md border border-primary/20 my-1"
                >
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>{message.resource.name}</span>
                </a>
              )}
              {message.content && !message.file_url && (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm dark:prose-invert max-w-none"
                    components={{
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"/>,
                    }}
                >
                    {message.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      );
    };

    const MessageList = ({ children, onMouseUp }) => {
        const scrollAreaRef = useRef(null);
        const viewportRef = useRef(null);
    
        useEffect(() => {
            if (viewportRef.current) {
                const isScrolledToBottom = viewportRef.current.scrollHeight - viewportRef.current.clientHeight <= viewportRef.current.scrollTop + 1;
                if (isScrolledToBottom) {
                    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
                }
            }
        }, [children]);

      return (
        <ScrollArea 
          className="flex-grow w-full" 
          ref={scrollAreaRef} 
          viewportRef={viewportRef}
          onMouseUp={onMouseUp}
        >
          <div className="px-4 w-full">
            {children}
          </div>
        </ScrollArea>
      );
    };

    MessageList.Item = MessageItem;

    export default MessageList;