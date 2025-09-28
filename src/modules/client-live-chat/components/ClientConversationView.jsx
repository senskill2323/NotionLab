import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Bot, User, File as FileIcon, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useResourceCreation } from '@/contexts/ResourceCreationContext';
import TextSelectionMenu from '@/components/chat/TextSelectionMenu';
import ChatInput from '@/components/chat/ChatInput';
import RichTextRenderer from '@/components/RichTextRenderer';

const STAFF_SENDERS = new Set(['admin', 'owner', 'prof']);

const STATUS_CONFIG = {
  a_traiter: { label: 'A traiter', variant: 'destructive' },
  en_cours: { label: 'En cours', variant: 'default' },
  resolu: { label: 'Resolu', variant: 'secondary' },
  abandonne: { label: 'Abandonne', variant: 'outline' },
  ouvert: { label: 'Ouvert', variant: 'default' },
};

const ConversationHeader = ({ conversation, onExport, exporting, isRefreshing }) => {
  const statusConfig = STATUS_CONFIG[conversation?.status] || STATUS_CONFIG.ouvert;
  const updatedAt = conversation?.updated_at
    ? new Date(conversation.updated_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const staffName = `${conversation?.staff_first_name || ''} ${conversation?.staff_last_name || ''}`.trim();
  const staffRoleLabel = conversation?.staff_user_type ? conversation.staff_user_type.toUpperCase() : null;
  const displayName = staffName || 'Equipe NotionLab';

  return (
    <header className="flex flex-col gap-3 border-b border-border/70 bg-card/60 px-4 py-3 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{displayName}</h2>
          {staffRoleLabel && (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{staffRoleLabel}</span>
          )}
          <Badge variant={statusConfig.variant} className="uppercase text-2xs tracking-wide">
            {statusConfig.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {updatedAt ? `Derniere mise a jour : ${updatedAt}` : 'Conversation en cours'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isRefreshing && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <Button type="button" variant="outline" size="sm" onClick={onExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
    </header>
  );
};

const Attachment = ({ message }) => {
  if (message.file_url) {
    const isImage = message.file_type?.startsWith('image/');
    if (isImage) {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="block">
          <img src={message.file_url} alt={message.content || 'Image envoyee'} className="max-w-[260px] rounded-lg border" />
        </a>
      );
    }
    return (
      <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
        <FileIcon className="h-4 w-4" />
        <span>{message.content || 'Fichier joint'}</span>
      </a>
    );
  }
  if (message.resource) {
    let href = message.resource.url || message.resource.public_url;
    if (!href && message.resource.file_path) {
      try {
        const { data } = supabase.storage.from('resources').getPublicUrl(message.resource.file_path);
        href = data?.publicUrl || href;
      } catch (_err) {
        href = href || '#';
      }
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
      >
        <BookOpen className="h-4 w-4" />
        <span>{message.resource.name}</span>
      </a>
    );
  }
  return null;
};

const CompactMessage = ({ message, isFirstInGroup }) => {
  const isStaffMessage = STAFF_SENDERS.has(message.sender);
  const authorLabel = isStaffMessage ? 'NotionLab' : 'Vous';
  const createdAt = message?.created_at
    ? new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex w-full gap-3"
    >
      <div className="w-9 flex-shrink-0">
        {isFirstInGroup && (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border',
              isStaffMessage ? 'bg-primary text-white border-primary/70' : 'bg-muted text-muted-foreground border-border'
            )}
          >
            {isStaffMessage ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
        )}
      </div>
      <div className="flex-1 text-sm">
        {isFirstInGroup && (
          <div className="mb-1 flex items-baseline gap-2">
            <span className="font-semibold text-foreground" data-author={authorLabel}>
              {authorLabel}
            </span>
            <span className="text-xs text-muted-foreground">{createdAt}</span>
          </div>
        )}
        <div className="message-bubble rounded-lg bg-card/80 px-4 py-3 text-foreground shadow-sm" data-author={authorLabel}>
          <div className="flex flex-col gap-2 message-content">
            <Attachment message={message} />
            {message.content && !message.file_url && <RichTextRenderer content={message.content} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ConversationEmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
    <Bot className="h-12 w-12 text-primary/50" />
    <p className="font-medium">Selectionnez une conversation pour demarrer</p>
    <p className="text-sm">Les messages recents apparaitront ici.</p>
  </div>
);

const ConversationLoading = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-primary/70">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    <p className="text-sm font-medium">Chargement des messages...</p>
  </div>
);

const getFormattedSelection = (selection) => {
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  const bubbles = new Set();

  const findParentBubble = (node) =>
    node.nodeType === 1 ? node.closest('.message-bubble') : node.parentElement?.closest('.message-bubble');

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
    .map((bubble) => {
      const author = bubble.dataset.author || 'Anonyme';
      const contentNode = bubble.querySelector('.message-content');
      if (!contentNode) {
        return `${author}:`;
      }
      const selectionWithinBubble = window.getSelection();
      selectionWithinBubble.removeAllRanges();
      const bubbleRange = document.createRange();
      bubbleRange.selectNodeContents(contentNode);
      selectionWithinBubble.addRange(bubbleRange);
      const bubbleText = selectionWithinBubble.toString().trim();
      selectionWithinBubble.removeAllRanges();
      selectionWithinBubble.addRange(range);
      return `${author}:\n${bubbleText}`;
    })
    .join('\n\n');
};

const ClientConversationView = ({
  conversation,
  messages,
  isLoading,
  isRefreshing = false,
  onSendMessage,
  onSendFile,
  onSendResource,
  onClearChat,
  isStaff,
}) => {
  const viewportRef = useRef(null);
  const { toast } = useToast();
  const { openResourceDialog } = useResourceCreation();
  const [selectionState, setSelectionState] = useState(null);
  const [exporting, setExporting] = useState(false);

  const groupedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return messages.map((message, index) => {
      const previous = messages[index - 1];
      const isFirstInGroup = !previous || previous.sender !== message.sender;
      return { message, isFirstInGroup };
    });
  }, [messages]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const viewportEl = viewportRef.current;
    viewportEl.scrollTop = viewportEl.scrollHeight;
  }, [messages]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const rawText = selection.toString().trim();
    if (!rawText) {
      setSelectionState(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionState({
      rawText,
      formattedText: getFormattedSelection(selection),
      position: {
        top: rect.top + window.scrollY - 56,
        left: rect.left + window.scrollX + rect.width / 2,
      },
    });
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (!selectionState) return;
      if (!event.target.closest('.message-bubble')) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setSelectionState(null);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectionState]);

  const handleCopy = () => {
    if (!selectionState) return;
    navigator.clipboard.writeText(selectionState.rawText);
    toast({ title: 'Copie realisee', description: 'Le texte a ete copie.' });
    setSelectionState(null);
  };

  const handleCreateResource = () => {
    if (!selectionState) return;
    openResourceDialog({
      content: selectionState.formattedText,
      type: 'Note',
      format: 'internal_note',
    });
    setSelectionState(null);
  };

  const handleExport = async () => {
    if (!conversation) return;
    if (!messages || messages.length === 0) {
      toast({ title: 'Aucun message', description: 'Rien a exporter pour le moment.' });
      return;
    }
    try {
      setExporting(true);
      const data = messages.map((message) => ({
        Horodatage: new Date(message.created_at).toLocaleString('fr-FR'),
        Auteur: STAFF_SENDERS.has(message.sender) ? 'NotionLab' : 'Vous',
        Message: message.content || '',
        Fichier: message.file_url || '',
      }));
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation-${conversation.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Export realise', description: 'Le fichier CSV a ete genere.' });
    } catch (error) {
      console.error('Export CSV error', error);
      toast({ title: 'Erreur', description: "Impossible d'exporter la conversation.", variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex h-full flex-col">
        <ConversationEmptyState />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <ConversationHeader conversation={conversation} onExport={handleExport} exporting={exporting} isRefreshing={isRefreshing} />
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full" viewportRef={viewportRef} onMouseUp={handleMouseUp}>
          <div className="flex flex-col gap-4 px-4 py-4">
            {isLoading ? (
              <ConversationLoading />
            ) : groupedMessages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                Aucun message pour le moment.
              </p>
            ) : (
              groupedMessages.map(({ message, isFirstInGroup }) => (
                <CompactMessage key={message.id || message.created_at} message={message} isFirstInGroup={isFirstInGroup} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      <Separator />
      <ChatInput
        variant="client"
        onSendMessage={async (value) => {
          try {
            await onSendMessage?.(value);
          } catch (error) {
            toast({
              title: 'Erreur',
              description: error?.message || "Impossible d'envoyer le message.",
              variant: 'destructive',
            });
          }
        }}
        onFileSelect={async (file) => {
          try {
            await onSendFile?.(file);
          } catch (error) {
            toast({
              title: 'Erreur',
              description: error?.message || "Impossible d'envoyer le fichier.",
              variant: 'destructive',
            });
          }
        }}
        onSelectResource={async (resource) => {
          try {
            await onSendResource?.(resource);
          } catch (error) {
            toast({
              title: 'Erreur',
              description: error?.message || "Impossible de partager la ressource.",
              variant: 'destructive',
            });
          }
        }}
        onClearChat={
          isStaff
            ? async () => {
                try {
                  await onClearChat?.();
                  toast({
                    title: 'Conversation videe',
                    description: 'Tous les messages ont ete supprimes.',
                  });
                } catch (error) {
                  toast({
                    title: 'Erreur',
                    description: error?.message || "Impossible de vider la conversation.",
                    variant: 'destructive',
                  });
                }
              }
            : undefined
        }
        isAdmin={isStaff}
        className="bg-background"
      />
      <TextSelectionMenu
        position={selectionState?.position}
        onCopy={handleCopy}
        onCreateResource={handleCreateResource}
      />
    </div>
  );
};

export default ClientConversationView;
