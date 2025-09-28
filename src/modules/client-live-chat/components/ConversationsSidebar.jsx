import React, { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Archive, ArchiveRestore, Search, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  a_traiter: { label: 'A traiter', variant: 'destructive' },
  en_cours: { label: 'En cours', variant: 'default' },
  resolu: { label: 'Resolu', variant: 'secondary' },
  abandonne: { label: 'Abandonne', variant: 'outline' },
  ouvert: { label: 'Ouvert', variant: 'default' },
};

const formatUpdatedAt = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_err) {
    return value;
  }
};

const getInitials = (value) => {
  if (!value) return 'NL';
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return initials || 'NL';
};

const NewConversationButton = ({ staffRecipients, onStartConversation, isLoading }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [formError, setFormError] = useState('');

  const staffOptions = useMemo(() => {
    if (!Array.isArray(staffRecipients)) return [];
    return staffRecipients.map((staff) => {
      const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
      return {
        id: staff.id,
        label: fullName || 'Sans nom',
        role: staff.user_type || '',
      };
    });
  }, [staffRecipients]);

  const resetDialogState = () => {
    setSelectedStaffId('');
    setFormError('');
  };

  const openDialog = () => {
    if (typeof onStartConversation !== 'function') return;
    resetDialogState();
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedStaffId) {
      setFormError('Selectionne un destinataire.');
      return;
    }
    if (isStarting || typeof onStartConversation !== 'function') return;
    setIsStarting(true);
    setFormError('');
    try {
      await onStartConversation(selectedStaffId);
      setDialogOpen(false);
      resetDialogState();
    } finally {
      setIsStarting(false);
    }
  };

  if (typeof onStartConversation !== 'function') {
    return null;
  }

  const isConfirmDisabled = isLoading || isStarting || staffOptions.length === 0;

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="flex-1 justify-center gap-2"
        onClick={openDialog}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        <span>Nouvelle conversation</span>
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetDialogState();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir un destinataire</DialogTitle>
            <DialogDescription>
              Selectionne un membre de l'equipe (admin, owner ou prof) pour demarrer la conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Select
              value={selectedStaffId}
              onValueChange={(value) => {
                setSelectedStaffId(value);
                setFormError('');
              }}
              disabled={isLoading || staffOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Chargement...' : 'Choisis un destinataire'} />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex flex-col">
                      <span>{staff.label}</span>
                      {staff.role && (
                        <span className="text-xs uppercase text-muted-foreground">{staff.role}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {staffOptions.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">
                Aucun destinataire disponible. Contacte un administrateur.
              </p>
            )}
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isStarting}>
              Annuler
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={isConfirmDisabled}>
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Commencer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};const ConversationListItem = ({ conversation, isSelected, onSelect, onToggleArchive }) => {
  const statusConfig = STATUS_CONFIG[conversation.status] || STATUS_CONFIG.ouvert;
  const isArchived = conversation.client_archived;
  const staffName = `${conversation.staff_first_name || ''} ${conversation.staff_last_name || ''}`.trim();
  const staffRoleLabel = conversation.staff_user_type ? conversation.staff_user_type.toUpperCase() : null;
  const displayName = staffName || 'Equipe NotionLab';
  const avatarFallback = getInitials(staffName || 'NotionLab');
  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={isSelected}
      className={cn(
        'group relative flex w-full gap-3 rounded-xl border px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary/40' : 'border-transparent hover:border-border hover:bg-muted/40'
      )}
      onClick={() => onSelect?.(conversation.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(conversation.id);
        }
      }}
    >
      <Avatar className="h-10 w-10 border">
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
            {staffRoleLabel && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {staffRoleLabel}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatUpdatedAt(conversation.updated_at)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {conversation.summary || 'Nouvelle conversation...'}
        </p>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={statusConfig.variant} className="text-2xs uppercase tracking-wide py-0.5 px-1.5">
            {statusConfig.label}
          </Badge>
          <div className="flex items-center gap-2">
            {conversation.has_unread && !isSelected && (
              <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-label="Message non lu" />
            )}
            {onToggleArchive && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleArchive(conversation.id, !isArchived);
                }}
                title={isArchived ? 'Desarchiver' : 'Archiver'}
              >
                {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConversationsSidebarSkeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="h-10 rounded-lg bg-muted animate-pulse" />
    <div className="grid gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-20 rounded-xl border border-border/60 bg-muted/60 animate-pulse" />
      ))}
    </div>
  </div>
);

const ConversationsSidebar = ({
  conversations,
  view,
  onViewChange,
  searchTerm,
  onSearchChange,
  onSelectConversation,
  selectedConversationId,
  onToggleArchive,
  staffRecipients,
  onStartConversation,
  isLoadingStaffRecipients,
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="space-y-3">
        <NewConversationButton
          staffRecipients={staffRecipients}
          onStartConversation={onStartConversation}
          isLoading={isLoadingStaffRecipients}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Rechercher une conversation..."
            className="pl-9"
          />
        </div>
        <Tabs value={view} onValueChange={onViewChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Actives</TabsTrigger>
            <TabsTrigger value="archived">Archivees</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ScrollArea className="flex-1" type="scroll">
        <div role="listbox" aria-label="Conversations" className="flex flex-col gap-2 pr-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucune conversation.</p>
          ) : (
            conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
                onSelect={onSelectConversation}
                onToggleArchive={onToggleArchive}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationsSidebar;



