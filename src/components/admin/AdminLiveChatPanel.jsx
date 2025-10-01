import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Inbox } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ConversationList from '@/components/admin/chat/ConversationList';
import AdminChatView from '@/components/admin/AdminChatView';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  listAdminChatRecipients,
  listAdminConversations,
  markConversationViewedByAdmin,
  startAdminConversation,
  subscribeToAdminChatMessages,
  subscribeToAdminConversations,
} from '@/lib/chatApi';

const RECIPIENT_ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  prof: 'Prof',
  client: 'Client',
};

/**
 * @param {Object} props
 * @param {'active' | 'archived'} [props.initialView='active'] Initial view to render.
 * @param {string} [props.initialConversationId] Conversation id to open automatically if available.
 * @param {() => void} [props.onActivityCleared] Callback fired after marking messages as read.
 * @param {boolean} [props.disableAutoMarkViewed=false] Disable automatic marking of conversations as read.
 * @param {(conversation: object | null) => void} [props.onConversationSelected] Callback fired when the active conversation changes.
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
const AdminLiveChatPanel = ({
  initialView = 'active',
  initialConversationId,
  onActivityCleared,
  disableAutoMarkViewed = false,
  onConversationSelected,
  className,
  style,
}) => {
  const { user: currentUser } = useAuth();
  const onActivityClearedRef = useRef(onActivityCleared);

  useEffect(() => {
    onActivityClearedRef.current = onActivityCleared;
  }, [onActivityCleared]);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(initialView);
  const markViewInFlightRef = useRef(false);
  const hasAutoSelectedRef = useRef(false);
  const { toast } = useToast();

  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [newConversationError, setNewConversationError] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const sortedConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return [...conversations].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }, [conversations]);

  useEffect(() => {
    if (!selectedConversation?.id) return;
    const fresh = sortedConversations.find((conversation) => conversation.id === selectedConversation.id);
    if (fresh && fresh !== selectedConversation) {
      setSelectedConversation(fresh);
    }
  }, [sortedConversations, selectedConversation]);

  const formatRecipientOption = useCallback((recipient) => {
    if (!recipient) return '';
    const fullName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim();
    const baseLabel = fullName || recipient.email || 'Sans nom';
    const roleKey = (recipient.user_type || '').toLowerCase();
    const roleLabel = recipient.user_type_display_name || RECIPIENT_ROLE_LABELS[roleKey] || 'Utilisateur';
    const email = recipient.email || '';
    const sameAsBase = email && baseLabel.toLowerCase() === email.toLowerCase();
    return `${baseLabel} - ${roleLabel}${email && !sameAsBase ? ` - ${email}` : ''}`;
  }, []);

  const markConversationAsViewed = useCallback(async (conversationId) => {
    if (!conversationId || disableAutoMarkViewed) return;
    if (markViewInFlightRef.current) return;

    markViewInFlightRef.current = true;

    try {
      const updated = await markConversationViewedByAdmin(conversationId);
      if (updated?.id) {
        setConversations((prev) =>
          Array.isArray(prev)
            ? prev.map((conversation) =>
                conversation.id === updated.id ? { ...conversation, ...updated } : conversation
              )
            : prev
        );
        setSelectedConversation((prev) =>
          prev?.id === updated.id ? { ...prev, ...updated } : prev
        );
      }
      onActivityClearedRef.current?.();
    } catch (error) {
      console.error('markConversationViewedByAdmin failed', { conversationId, error });
    } finally {
      markViewInFlightRef.current = false;
    }
  }, [disableAutoMarkViewed]);

  const fetchConversations = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
    }
    try {
      const nextConversations = await listAdminConversations({ view, limit: 100, offset: 0 });
      setConversations(Array.isArray(nextConversations) ? nextConversations : []);
      if (!nextConversations || nextConversations.length === 0) {
        setSelectedConversation(null);
        hasAutoSelectedRef.current = false;
      }
    } catch (error) {
      console.error('fetchConversations failed', error);
      toast({ title: 'Erreur', description: "Impossible de charger les conversations.", variant: 'destructive' });
      setConversations([]);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [toast, view]);

  const fetchRecipients = useCallback(async () => {
    setIsLoadingRecipients(true);
    try {
      const data = await listAdminChatRecipients();
      setRecipientOptions(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setNewConversationError('');
      }
      if (Array.isArray(data) && data.length === 0) {
        setNewConversationError('Aucun destinataire actif disponible.');
      }
    } catch (error) {
      console.error('listAdminChatRecipients failed:', error);
      const description = error?.message || 'Impossible de charger les destinataires.';
      setNewConversationError(description);
      toast({ title: 'Erreur', description, variant: 'destructive' });
    } finally {
      setIsLoadingRecipients(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!initialConversationId || hasAutoSelectedRef.current) return;
    const match = sortedConversations.find((conversation) => conversation.id === initialConversationId);
    if (match) {
      setSelectedConversation(match);
      hasAutoSelectedRef.current = true;
    }
  }, [initialConversationId, sortedConversations]);

  useEffect(() => {
    if (selectedConversation?.id) {
      onConversationSelected?.(selectedConversation);
      markConversationAsViewed(selectedConversation.id);
    } else {
      onConversationSelected?.(null);
    }
  }, [selectedConversation, markConversationAsViewed, onConversationSelected]);

  useEffect(() => {
    const handleConversationEvent = (payload) => {
      if (!payload) {
        fetchConversations({ background: true });
        return;
      }

      const eventType = payload.eventType;
      const newRecord = payload.new;
      const oldRecord = payload.old;

      if (eventType === 'INSERT') {
        fetchConversations({ background: true });
        return;
      }

      if (eventType === 'DELETE') {
        if (oldRecord?.id) {
          setConversations((prev) =>
            Array.isArray(prev) ? prev.filter((conversation) => conversation.id !== oldRecord.id) : []
          );
        }
        return;
      }

      if (eventType === 'UPDATE') {
        if (!newRecord) {
          fetchConversations({ background: true });
          return;
        }

        const requiresRefetch =
          newRecord.staff_user_id !== oldRecord?.staff_user_id ||
          newRecord.status !== oldRecord?.status ||
          newRecord.admin_archived !== oldRecord?.admin_archived;

        if (requiresRefetch) {
          fetchConversations({ background: true });
          return;
        }

        setConversations((prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((conversation) =>
            conversation.id === newRecord.id
              ? { ...conversation, updated_at: newRecord.updated_at }
              : conversation
          );
        });
      }
    };

    const subscription = subscribeToAdminConversations(handleConversationEvent, {
      onFallback: async ({ reason }) => {
        try {
          console.warn('admin live chat conversation fallback', { reason });
          await fetchConversations({ background: true });
        } catch (error) {
          console.error('admin live chat conversation fallback failed', { reason, error });
        }
      },
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [fetchConversations]);

  useEffect(() => {
    const subscription = subscribeToAdminChatMessages((payload) => {
      if (!payload) {
        fetchConversations({ background: true });
        return;
      }

      const message = payload.new;
      if (!message?.conversation_id) return;

      setConversations((prev) => {
        if (!Array.isArray(prev)) return prev;
        const updated = prev.map((conversation) => {
          if (conversation.id === message.conversation_id) {
            return {
              ...conversation,
              summary: message.content?.substring(0, 45) || conversation.summary || '',
              updated_at: message.created_at,
            };
          }
          return conversation;
        });
        return updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      });
    }, {
      onFallback: async () => {
        fetchConversations({ background: true });
      },
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [fetchConversations]);


  const handleSelectConversation = useCallback((conversation) => {
    setSelectedConversation(conversation);
    if (!disableAutoMarkViewed && conversation?.id) {
      markConversationAsViewed(conversation.id);
    }
  }, [disableAutoMarkViewed, markConversationAsViewed]);

  const handleViewChange = useCallback((nextView) => {
    setView(nextView);
    setSelectedConversation(null);
    if (nextView === 'archived') {
      hasAutoSelectedRef.current = false;
    }
  }, []);

  const handleNewConversationOpenChange = useCallback((open) => {
    setNewConversationOpen(open);
    if (open) {
      setSelectedRecipientId('');
      setNewConversationError('');
      if (recipientOptions.length === 0 && !isLoadingRecipients) {
        fetchRecipients();
      }
    } else {
      setIsCreatingConversation(false);
      setSelectedRecipientId('');
      setNewConversationError('');
    }
  }, [fetchRecipients, isLoadingRecipients, recipientOptions.length]);

  const handleOpenNewConversation = useCallback(() => {
    handleNewConversationOpenChange(true);
  }, [handleNewConversationOpenChange]);

  const handleRecipientChange = useCallback((value) => {
    setSelectedRecipientId(value);
    setNewConversationError('');
  }, []);

  const handleRefreshRecipients = useCallback(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const handleCreateConversation = useCallback(async () => {
    if (!selectedRecipientId) {
      setNewConversationError('Choisis un destinataire avant de commencer.');
      return;
    }

    const staffUserId = currentUser?.id;
    if (!staffUserId) {
      toast({ title: 'Session requise', description: 'Reconnecte-toi pour creer une conversation.', variant: 'destructive' });
      return;
    }

    const recipient = recipientOptions.find((item) => item.id === selectedRecipientId);
    if (!recipient) {
      setNewConversationError('Destinataire introuvable.');
      return;
    }

    setIsCreatingConversation(true);
    setNewConversationError('');

    try {
      const conversation = await startAdminConversation({ staffUserId, recipient, forceNew: true });
      if (!conversation?.id) {
        throw new Error('Conversation introuvable apres creation.');
      }

      setConversations((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const index = next.findIndex((item) => item.id === conversation.id);
        if (index >= 0) {
          next[index] = { ...next[index], ...conversation };
        } else {
          next.push(conversation);
        }
        return next.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      });

      setView('active');
      setSelectedConversation(conversation);
      hasAutoSelectedRef.current = true;
      handleNewConversationOpenChange(false);
    } catch (error) {
      console.error('startAdminConversation failed:', error);
      const description = error?.message || 'Impossible de creer la conversation.';
      setNewConversationError(description);
      toast({ title: 'Erreur', description, variant: 'destructive' });
    } finally {
      setIsCreatingConversation(false);
    }
  }, [currentUser?.id, handleNewConversationOpenChange, recipientOptions, selectedRecipientId, toast]);

  const canSelectRecipients = recipientOptions.length > 0;
  const isConfirmDisabled = !selectedRecipientId || isCreatingConversation;

  return (
    <>
      <div className={cn('flex h-full min-h-0', className)} style={style}>
        <aside className="w-full md:w-[320px] lg:w-[350px] flex-shrink-0 border-r bg-card overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <ConversationList
              conversations={sortedConversations}
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              view={view}
              onViewChange={handleViewChange}
              onRequestNewConversation={handleOpenNewConversation}
              newConversationDisabled={isCreatingConversation}
            />
          )}
        </aside>
        <main className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
          {selectedConversation ? (
            <AdminChatView key={selectedConversation.id} conversation={selectedConversation} />
          ) : (
            <div className="flex flex-col items-center justify-center flex-grow text-center text-muted-foreground bg-background">
              <Inbox className="w-20 h-20 mb-4 text-primary/30" />
              <h2 className="text-2xl font-semibold">
                {view === 'archived' ? 'Conversations archivees' : 'Bienvenue dans le Live Chat'}
              </h2>
              <p>
                {view === 'archived'
                  ? 'Selectionnez une conversation archivee pour la consulter.'
                  : 'Selectionnez une conversation dans la liste pour commencer.'}
              </p>
            </div>
          )}
        </main>
      </div>

      <Dialog open={newConversationOpen} onOpenChange={handleNewConversationOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
            <DialogDescription>
              Choisis un destinataire (admin, owner, prof ou client) pour demarrer un nouveau fil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Destinataire</p>
              <Select
                value={selectedRecipientId}
                onValueChange={handleRecipientChange}
                disabled={!canSelectRecipients}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingRecipients ? 'Chargement...' : 'Selectionne un destinataire'} />
                </SelectTrigger>
                <SelectContent>
                  {recipientOptions.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      {formatRecipientOption(recipient)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingRecipients && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Chargement des destinataires...</span>
                </div>
              )}
              {!isLoadingRecipients && !canSelectRecipients && (
                <div className="rounded-md border border-dashed border-muted p-3 text-sm text-muted-foreground space-y-2">
                  <p>Aucun destinataire actif n'est disponible.</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleRefreshRecipients} disabled={isLoadingRecipients}>
                    Reessayer
                  </Button>
                </div>
              )}
            </div>
            {newConversationError && (
              <p className="text-sm text-destructive">{newConversationError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleNewConversationOpenChange(false)}
              disabled={isCreatingConversation}
            >
              Annuler
            </Button>
            <Button type="button" onClick={handleCreateConversation} disabled={isConfirmDisabled}>
              {isCreatingConversation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creation...
                </>
              ) : (
                'Commencer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminLiveChatPanel;
