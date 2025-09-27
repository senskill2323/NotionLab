import React, { useRef, useEffect } from 'react';
    import { ScrollArea } from '@/components/ui/scroll-area';
    import { Paperclip, BookOpen } from 'lucide-react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { cn } from '@/lib/utils';
    import ReactMarkdown from 'react-markdown';
    import remarkGfm from 'remark-gfm';

    const MessageItem = ({ message, user }) => {
      const messageEntries = Array.isArray(message?.messages) && message.messages.length > 0
        ? message.messages
        : [message];

      const firstEntry = messageEntries[0];
      const isStaffMessage = ['admin', 'prof', 'owner'].includes(firstEntry?.sender);
      const senderName = isStaffMessage ? 'NotionLab' : (user?.profile?.first_name || 'Vous');

      const bubbleClasses = cn(
        "message-bubble p-3 rounded-lg max-w-[680px] break-words relative text-foreground rounded-bl-none self-start border border-border/30"
      );
      const bubbleStyle = {
        backgroundColor: `hsl(var(--colors-chat-bubble-${isStaffMessage ? 'staff' : 'user'}))`,
      };

      const formattedTime = firstEntry?.created_at
        ? new Date(firstEntry.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '';

      return (
        <div 
          className="flex flex-col w-full my-2 items-start"
          data-author={senderName}
        >
          <div className={bubbleClasses} style={bubbleStyle}>
            <div className="flex justify-between items-center mb-2">
              <p className={`font-semibold text-sm ${isStaffMessage ? 'text-primary' : 'text-foreground'}`}>{senderName}</p>
              <p className="text-xs text-muted-foreground ml-4">{formattedTime}</p>
            </div>
            <div className="text-sm space-y-2 message-content">
              {messageEntries.map((entry, idx) => (
                <div key={entry.id || entry.created_at || idx} className="space-y-1">
                  {entry.file_url && entry.file_type?.startsWith('image/') ? (
                    <a href={entry.file_url} target="_blank" rel="noopener noreferrer">
                      <img src={entry.file_url} alt="Image jointe" className="max-w-xs rounded-md my-1 border" />
                    </a>
                  ) : entry.file_url ? (
                    <a href={entry.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> {entry.content || 'Fichier joint'}
                    </a>
                  ) : null}
                  {entry.resource && (
                    <a 
                      href={entry.resource.url || (entry.resource.file_path ? supabase.storage.from('resources').getPublicUrl(entry.resource.file_path).data.publicUrl : '#')}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2 bg-primary/10 p-2 rounded-md border border-primary/20 my-1"
                    >
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span>{entry.resource.name}</span>
                    </a>
                  )}
                  {entry.content && !entry.file_url && (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>p]:leading-snug [&>ul]:my-1 [&>ol]:my-1"
                      components={{
                        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
                      }}
                    >
                      {entry.content}
                    </ReactMarkdown>
                  )}
                </div>
              ))}
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
