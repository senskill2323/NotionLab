import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Search, Archive, ArchiveRestore, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useDebounce } from 'use-debounce';

const AUTO_ARCHIVED_STATUSES = new Set(['resolu', 'abandonne']);

const getInitials = (email) => {
  if (!email) return '..';
  const parts = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').split(' ');
  return parts.map(p => p.charAt(0)).join('').toUpperCase().substring(0, 2);
}

const statusVariantMap = {
  'a_traiter': 'destructive',
  'en_cours': 'default',
  'resolu': 'secondary',
  'abandonne': 'outline',
  'ouvert': 'default'
};

const statusLabelMap = {
  'a_traiter': 'A traiter',
  'en_cours': 'En cours',
  'resolu': 'Resolu',
  'abandonne': 'Abandonne',
  'ouvert': 'Ouvert'
};

const ConversationItem = ({ conversation, isSelected, onSelect, canArchive, onToggleArchive, archived }) => {
  const statusVariant = statusVariantMap[conversation.status] || 'secondary';
  const statusLabel = statusLabelMap[conversation.status] || conversation.status;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation)}
      className={cn(
        "flex items-center gap-3 w-full p-2 rounded-lg text-left transition-colors",
        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
      )}
    >
      <Avatar className="h-9 w-9">
        <AvatarFallback>{getInitials(conversation.guest_email)}</AvatarFallback>
      </Avatar>
      <div className="flex-grow overflow-hidden">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-sm truncate">{conversation.guest_email || 'Visiteur'}</p>
          <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
            {new Date(conversation.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </p>
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-muted-foreground truncate pr-2">
            {conversation.summary || 'Nouvelle conversation...'}
          </p>
          <div className="flex items-center gap-1">
            <Badge variant={statusVariant} className="text-xs px-1.5 py-0.5">{statusLabel}</Badge>
            {canArchive && (
              <Button
                variant="ghost"
                size="icon"
                title={archived ? 'Desarchiver' : 'Archiver'}
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onToggleArchive?.(conversation); }}
              >
                {archived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ConversationList = ({ conversations, selectedConversation, onSelectConversation, view = 'active', onViewChange, onRequestNewConversation, newConversationDisabled = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const { toast } = useToast();
  const { user } = useAuth();
  const canArchive = !!(user && ['owner', 'admin'].includes(user.profile?.user_type));
  const [archOverrides, setArchOverrides] = useState({});

  const handleToggleArchive = async (conversation) => {
    try {
      const currentArchived = Object.prototype.hasOwnProperty.call(archOverrides, conversation.id)
        ? !!archOverrides[conversation.id]
        : (conversation.admin_archived === true);
      const nextArchived = !currentArchived;
      const { error } = await supabase.rpc('admin_chat_set_archived', { p_id: conversation.id, p_archived: nextArchived });
      if (error) throw error;
      setArchOverrides((prev) => ({ ...prev, [conversation.id]: nextArchived }));
      toast({ title: 'Succes', description: nextArchived ? 'Conversation archivee.' : 'Conversation desarchivee.' });
    } catch (err) {
      console.error('Toggle archive failed:', err);
      toast({ title: 'Erreur', description: `Impossible de mettre a jour l'archivage. ${err?.message || ''}`, variant: 'destructive' });
    }
  };

  const filteredConversations = useMemo(() => {
    const computeArchived = (conversation) => {
      if (Object.prototype.hasOwnProperty.call(archOverrides, conversation.id)) {
        return !!archOverrides[conversation.id];
      }
      const status = (conversation.status || '').toLowerCase();
      const autoArchived = AUTO_ARCHIVED_STATUSES.has(status);
      return conversation.admin_archived === true || autoArchived;
    };

    let listByView = conversations;
    if (view === 'archived') {
      listByView = conversations.filter((conversation) => computeArchived(conversation));
    } else {
      listByView = conversations.filter((conversation) => {
        if (computeArchived(conversation)) return false;
        const status = (conversation.status || '').toLowerCase();
        return status === 'ouvert';
      });
    }

    if (!debouncedSearchTerm) return listByView;
    const lowered = debouncedSearchTerm.toLowerCase();
    return listByView.filter((conversation) =>
      (conversation.guest_email && conversation.guest_email.toLowerCase().includes(lowered)) ||
      (conversation.summary && conversation.summary.toLowerCase().includes(lowered))
    );
  }, [archOverrides, conversations, debouncedSearchTerm, view]);
  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Conversations</h2>
          {typeof onRequestNewConversation === 'function' && (
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={onRequestNewConversation}
              disabled={newConversationDisabled}
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle conversation</span>
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-muted pl-8"
          />
        </div>
        {canArchive && onViewChange && (
          <Tabs value={view} onValueChange={onViewChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Actives</TabsTrigger>
              <TabsTrigger value="archived">Archivees</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-2 space-y-1">
          {filteredConversations.length > 0 ? filteredConversations.map((conversation) => {
            const effectiveArchived = (() => {
              if (Object.prototype.hasOwnProperty.call(archOverrides, conversation.id)) {
                return !!archOverrides[conversation.id];
              }
              const status = (conversation.status || '').toLowerCase();
              if (AUTO_ARCHIVED_STATUSES.has(status)) return true;
              return conversation.admin_archived === true;
            })();
            return (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                onSelect={onSelectConversation}
                canArchive={canArchive}
                onToggleArchive={handleToggleArchive}
                archived={effectiveArchived}
              />
            );
          }) : (
            <p className="p-4 text-sm text-center text-muted-foreground">Aucune conversation trouvee.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
