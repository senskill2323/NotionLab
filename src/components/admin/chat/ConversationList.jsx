import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Search, ArrowLeft, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useDebounce } from 'use-debounce';

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
  'a_traiter': 'À traiter',
  'en_cours': 'En cours',
  'resolu': 'Résolu',
  'abandonne': 'Abandonné',
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
                title={archived ? 'Désarchiver' : 'Archiver'}
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

const ConversationList = ({ conversations, selectedConversation, onSelectConversation, view = 'active', onViewChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const navigate = useNavigate();
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
      toast({ title: 'Succès', description: nextArchived ? 'Conversation archivée.' : 'Conversation désarchivée.' });
    } catch (err) {
      console.error('Toggle archive failed:', err);
      toast({ title: 'Erreur', description: `Impossible de mettre à jour l'archivage. ${err?.message || ''}`, variant: 'destructive' });
    }
  };

  const filteredConversations = useMemo(() => {
    const isArchived = (c) => Object.prototype.hasOwnProperty.call(archOverrides, c.id)
      ? !!archOverrides[c.id]
      : (c.admin_archived === true);

    let listByView = conversations;
    if (view === 'archived') listByView = conversations.filter((c) => isArchived(c));
    else listByView = conversations.filter((c) => !isArchived(c));

    if (!debouncedSearchTerm) return listByView;
    return listByView.filter(c => 
      (c.guest_email && c.guest_email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (c.summary && c.summary.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [conversations, debouncedSearchTerm, view, archOverrides]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <h2 className="text-lg font-semibold">Conversations</h2>
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
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-2 space-y-1">
          {filteredConversations.length > 0 ? filteredConversations.map(conversation => {
            const effectiveArchived = Object.prototype.hasOwnProperty.call(archOverrides, conversation.id)
              ? !!archOverrides[conversation.id]
              : (conversation.admin_archived === true);
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
            <p className="p-4 text-sm text-center text-muted-foreground">Aucune conversation trouvée.</p>
          )}
        </div>
      </ScrollArea>
      {canArchive && onViewChange && (
        <div className="p-3 border-t">
          <Select value={view} onValueChange={onViewChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Conversations actives</SelectItem>
              <SelectItem value="archived">Conversations archivées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default ConversationList;