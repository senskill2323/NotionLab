import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
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

const ConversationItem = ({ conversation, isSelected, onSelect }) => {
  const statusVariant = statusVariantMap[conversation.status] || 'secondary';
  const statusLabel = statusLabelMap[conversation.status] || conversation.status;

  return (
    <button
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
          <Badge variant={statusVariant} className="text-xs px-1.5 py-0.5">{statusLabel}</Badge>
        </div>
      </div>
    </button>
  );
};

const ConversationList = ({ conversations, selectedConversation, onSelectConversation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const filteredConversations = useMemo(() => {
    if (!debouncedSearchTerm) return conversations;
    return conversations.filter(c => 
      (c.guest_email && c.guest_email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (c.summary && c.summary.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [conversations, debouncedSearchTerm]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-3 border-b">
        <h2 className="text-lg font-semibold mb-2">Conversations</h2>
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
          {filteredConversations.length > 0 ? filteredConversations.map(conversation => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversation?.id === conversation.id}
              onSelect={onSelectConversation}
            />
          )) : (
            <p className="p-4 text-sm text-center text-muted-foreground">Aucune conversation trouvée.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;