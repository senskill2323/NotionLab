import React, { useState, useEffect, useCallback, useRef } from 'react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useNavigate } from 'react-router-dom';
    import { Card, CardHeader, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { Loader2, PlusCircle, AlertCircle, Inbox, User, Ticket, Copy, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
    import { useToast } from '@/components/ui/use-toast';
    import { usePermissions } from '@/contexts/PermissionsContext';
    import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
    import ModuleHeader from '@/components/dashboard/ModuleHeader';
    import { cn } from '@/lib/utils';

    const TicketsPanel = ({ editMode = false }) => {
      const { user } = useAuth();
      const [tickets, setTickets] = useState([]);
      const [assignedUsers, setAssignedUsers] = useState({});
      const [loading, setLoading] = useState(!editMode);
      const [error, setError] = useState(null);
      const [activeTab, setActiveTab] = useState('inProgress');
      const [selectedIds, setSelectedIds] = useState(new Set());
      const navigate = useNavigate();
      const { toast } = useToast();
      const { permissions, loading: permissionsLoading } = usePermissions();
      const hasLoadedOnceRef = useRef(false);

      const getStatusBadgeConfig = (status) => {
        switch (status) {
          case 'A traiter': return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
          case 'En cours': return 'bg-orange-200 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200';
          case 'Resolu': return 'bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200';
          case 'Fermé': case 'Abandonné': return 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200';
          default: return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
      };

      const getPrioritéyBadgeConfig = (priority) => {
        switch (priority) {
          case 'Bas': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
          case 'Moyen': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
          case 'Haut': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
          case 'Urgent': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
          default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
        }
      };

      const canCreateTickets = permissions && permissions['tickets:create'];
      const canChangeStatus = permissions && permissions['tickets:change_status'];
      const canChangePrioritéy = permissions && permissions['tickets:change_priority'];

      const fetchTickets = useCallback(async () => {
        if (!user || editMode) return;
        if (!hasLoadedOnceRef.current) setLoading(true);
        setError(null);

        try {
            const { data, error: ticketsError } = await supabase
              .from('tickets')
              .select('*, assigned_to_profile:profiles!tickets_assigned_to_fkey(id, first_name, last_name)')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (ticketsError) throw ticketsError;

            let enrichedTickets = Array.isArray(data) ? [...data] : [];

            if (enrichedTickets.length > 0) {
              try {
                const ticketIds = enrichedTickets.map((ticket) => ticket.id).filter(Boolean);
                if (ticketIds.length > 0) {
                  const { data: repliesData, error: repliesError } = await supabase
                    .from('ticket_replies')
                    .select('ticket_id, user_id, created_at, profile:user_id(user_types(type_name))')
                    .in('ticket_id', ticketIds)
                    .order('created_at', { ascending: false });

                  if (repliesError) {
                    console.error('Error fetching ticket replies metadata:', repliesError);
                  } else if (Array.isArray(repliesData)) {
                    const latestReplyByTicket = new Map();
                    for (const reply of repliesData) {
                      if (!latestReplyByTicket.has(reply.ticket_id)) {
                        latestReplyByTicket.set(reply.ticket_id, reply);
                      }
                    }

                    const adminRoles = new Set(['owner', 'admin', 'prof']);

                    enrichedTickets = enrichedTickets.map((ticket) => {
                      const latestReply = latestReplyByTicket.get(ticket.id);
                      const authorRole = latestReply?.profile?.user_types?.type_name;
                      const replyAuthorId = latestReply?.user_id || null;
                      const isAdminAuthor = !!latestReply && (
                        adminRoles.has(authorRole) ||
                        (replyAuthorId && replyAuthorId !== ticket.user_id)
                      );
                      const hasNewAdminReply =
                        isAdminAuthor &&
                        (!ticket.client_last_viewed_at || new Date(latestReply.created_at) > new Date(ticket.client_last_viewed_at));

                      return { ...ticket, hasNewAdminReply };
                    });
                  }
                }
              } catch (metaErr) {
                console.error('Error enriching tickets with reply metadata:', metaErr);
              }
            }

            setTickets(enrichedTickets);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            setError('Impossible de charger vos tickets.');
            toast({
              title: 'Erreur',
              description: 'Impossible de charger vos tickets.',
              variant: 'destructive',
            });
        } finally {
            setLoading(false);
            hasLoadedOnceRef.current = true;
        }
      }, [user, toast, editMode]);

      useEffect(() => {
        if (user && !permissionsLoading) {
          fetchTickets();
        }
      }, [user, permissionsLoading, fetchTickets]);

      const handleFieldChange = async (ticketId, field, value) => {
        if (editMode) return;
        
        const originalTickets = [...tickets];
        const updatedTickets = tickets.map(t => t.id === ticketId ? { ...t, [field]: value } : t);
        setTickets(updatedTickets);

        const { error } = await supabase
          .from('tickets')
          .update({ [field]: value })
          .eq('id', ticketId);

        if (error) {
          console.error(`Error updating ticket ${field}:`, error);
          toast({ title: 'Erreur', description: 'Impossible de mettre à jour le champ du ticket.', variant: 'destructive' });
          setTickets(originalTickets);
        } else {
          toast({ title: 'Ticket mis à jour', description: 'Le champ a été modifié avec succès.' });
        }
      };

      const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR');
      const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      // Gestion sélection tickets
      const handleToggleSelect = (ticketId) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(ticketId)) {
          newSelected.delete(ticketId);
        } else {
          newSelected.add(ticketId);
        }
        setSelectedIds(newSelected);
      };

      const handleSelectAll = (ticketList) => {
        const currentTickets = ticketList ?? (activeTab === 'inProgress' ? inProgressTickets : archivedTickets);
        if (currentTickets.length === 0) return;

        const allSelected = currentTickets.every((ticket) => selectedIds.has(ticket.id));
        const newSelected = new Set(selectedIds);

        if (allSelected) {
          currentTickets.forEach((ticket) => newSelected.delete(ticket.id));
        } else {
          currentTickets.forEach((ticket) => newSelected.add(ticket.id));
        }

        setSelectedIds(newSelected);
      };

      const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));
        
        for (const ticket of selectedTickets) {
          const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', ticket.id);
          
          if (error) {
            toast({ title: "Erreur", description: `Impossible de supprimer le ticket ${ticket.reference_number}.`, variant: "destructive" });
          }
        }
        
        toast({ title: "Suppression réussie", description: `${selectedIds.size} ticket(s) supprimé(s).` });
        setSelectedIds(new Set());
        fetchTickets();
      };

      const handleBulkDuplicate = async () => {
        if (selectedIds.size === 0) return;
        
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));
        
        for (const ticket of selectedTickets) {
          const { error } = await supabase
            .from('tickets')
            .insert({
              title: `${ticket.title} (copie)`,
              description: ticket.description,
              priority: ticket.priority,
              status: 'A traiter',
              user_id: user.id
            });
          
          if (error) {
            toast({ title: "Erreur", description: `Impossible de dupliquer le ticket ${ticket.reference_number}.`, variant: "destructive" });
          }
        }
        
        toast({ title: "Duplication réussie", description: `${selectedTickets.length} ticket(s) dupliqué(s).` });
        setSelectedIds(new Set());
        fetchTickets();
      };

      const normalizeStatus = (status) =>
        (status || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

      const archivedStatusSet = new Set(['resolu', 'ferme', 'abandonne', 'closed']);

      const inProgressTickets = tickets.filter((t) => !archivedStatusSet.has(normalizeStatus(t.status)));
      const archivedTickets = tickets.filter((t) => archivedStatusSet.has(normalizeStatus(t.status)));
      
      const demoInProgressTicket = {id: 1, reference_number: 'CS-031', title: "Exemple de ticket en cours", status: "En cours", priority: "Haut", created_at: new Date().toISOString(), assigned_to_profile: { first_name: 'Yann', last_name: 'V.' } };
      const demoArchivedTicket = {id: 2, reference_number: 'CS-030', title: "Exemple de ticket archivé", status: "Resolu", priority: "Bas", created_at: new Date(Date.now() - 86400000).toISOString(), assigned_to_profile: { first_name: 'Yann', last_name: 'V.' } };

      const DESKTOP_GRID_TEMPLATE = 'grid-cols-[32px_110px_minmax(0,1fr)_150px_120px_110px_90px]';
      const columnsConfig = [
        {
          key: 'select',
          header: '',
          headerClassName: 'justify-center',
          cellClassName: 'flex items-center justify-center',
          render: (ticket) => (
            <Checkbox
              checked={selectedIds.has(ticket.id)}
              onCheckedChange={() => handleToggleSelect(ticket.id)}
              className="h-3.5 w-3.5"
              onClick={(e) => e.stopPropagation()}
            />
          )
        },
        {
          key: 'reference_number',
          header: 'N de ticket',
          headerClassName: 'justify-start text-left',
          cellClassName: 'font-mono text-xs text-muted-foreground flex items-center',
          render: (ticket) => ticket.reference_number || '-'
        },
        {
          key: 'title',
          header: 'Description du ticket',
          headerClassName: 'justify-start text-left',
          cellClassName: 'flex items-center gap-2 min-w-0 text-sm',
          render: (ticket) => (
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate max-w-[240px] xl:max-w-[320px]">{ticket.title}</span>
              {ticket.hasNewAdminReply && !editMode && (
                <span className="text-[10px] uppercase tracking-wide font-semibold text-primary border border-primary/40 bg-primary/10 rounded px-2 py-0.5 flex-shrink-0">
                  Réponse admin
                </span>
              )}
            </div>
          )
        },
        {
          key: 'status',
          header: 'Statut',
          headerClassName: 'justify-start',
          cellClassName: 'flex items-center',
          render: (ticket) => (
            <Select
              defaultValue={ticket.status}
              onValueChange={(newStatus) => handleFieldChange(ticket.id, 'status', newStatus)}
              disabled={editMode}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectTrigger className="h-7 w-full max-w-[140px] text-xs border-none shadow-none focus:ring-1 focus:ring-primary/20 [&>svg]:hidden">
                <SelectValue asChild>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 border-none ${getStatusBadgeConfig(ticket.status)}`}>
                    {ticket.status}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-[140px]">
                <SelectItem value="A traiter"> traiter</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Rsolu">Rsolu</SelectItem>
                <SelectItem value="Ferm">Ferm</SelectItem>
                <SelectItem value="Abandonn">Abandonn</SelectItem>
              </SelectContent>
            </Select>
          )
        },
        {
          key: 'priority',
          header: 'Prioritéé',
          headerClassName: 'justify-start',
          cellClassName: 'flex items-center',
          render: (ticket) => (
            <Select
              defaultValue={ticket.priority}
              onValueChange={(newPrioritéy) => handleFieldChange(ticket.id, 'priority', newPrioritéy)}
              disabled={editMode}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectTrigger className="h-7 w-full max-w-[120px] text-xs border-none shadow-none focus:ring-1 focus:ring-primary/20 [&>svg]:hidden">
                <SelectValue asChild>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 border-none ${getPrioritéyBadgeConfig(ticket.priority)}`}>
                    {ticket.priority}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-[120px]">
                <SelectItem value="Bas">Bas</SelectItem>
                <SelectItem value="Moyen">Moyen</SelectItem>
                <SelectItem value="Haut">Haut</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          )
        },
        {
          key: 'date',
          header: 'Date',
          headerClassName: 'justify-start',
          cellClassName: 'text-xs text-muted-foreground',
          render: (ticket) => formatDate(ticket.created_at)
        },
        {
          key: 'time',
          header: 'Heure',
          headerClassName: 'justify-start',
          cellClassName: 'text-xs text-muted-foreground',
          render: (ticket) => formatTime(ticket.created_at)
        }
      ];

      const renderTicketTable = (ticketList) => {
        if (ticketList.length === 0) {
          return (
            <div className="flex flex-col justify-center items-center h-40 text-muted-foreground">
              <Inbox className="w-8 h-8 mb-2" />
              <p>Aucun ticket dans cette catgorie.</p>
            </div>
          );
        }

        const selectColumn = columnsConfig.find((col) => col.key === 'select');
        const statusColumn = columnsConfig.find((col) => col.key === 'status');
        const priorityColumn = columnsConfig.find((col) => col.key === 'priority');
        const referenceColumn = columnsConfig.find((col) => col.key === 'reference_number');
        const listFullySelected = ticketList.length > 0 && ticketList.every((ticket) => selectedIds.has(ticket.id));
        const handleSelectAllForList = () => handleSelectAll(ticketList);

        return (
          <>
            <div className="sm:hidden space-y-0">
              <div className="flex items-center gap-2 px-2 py-1 mb-1 text-[11px] font-semibold uppercase tracking-wide text-white bg-muted/40 border border-border/60 rounded-md">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/5">
                  <Checkbox
                    checked={listFullySelected}
                    onCheckedChange={handleSelectAllForList}
                    className="h-3.5 w-3.5 border-primary/40"
                  />
                </span>
                <span>Tickets</span>
              </div>
              {ticketList.map((ticket) => {
                const isSelected = selectedIds.has(ticket.id);
                const hasNewReply = ticket.hasNewAdminReply && !editMode;
                const mobileClasses = cn(
                  'relative flex flex-col gap-1 rounded-md border border-border/60 bg-card/40 px-3 py-1 transition-all duration-200 cursor-pointer',
                  isSelected && 'ring-1 ring-primary/40 bg-primary/5',
                  hasNewReply && 'bg-primary/10 dark:bg-primary/20 animate-[pulse_1.6s_ease-in-out_infinite]'
                );

                return (
                  <div
                    key={`mobile-${ticket.id}`}
                    className={mobileClasses}
                    onClick={() => {
                      if (editMode) return;
                      if (ticket.hasNewAdminReply) {
                        setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, hasNewAdminReply: false } : t));
                      }
                      navigate(`/ticket/${ticket.id}`);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        {selectColumn?.render(ticket)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono">{referenceColumn?.render(ticket)}</span>
                          <span>{`${formatDate(ticket.created_at)} - ${formatTime(ticket.created_at)}`}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium truncate">{ticket.title}</p>
                        {ticket.hasNewAdminReply && !editMode && (
                          <span className="mt-1 inline-flex text-[10px] uppercase tracking-wide font-semibold text-primary border border-primary/40 bg-primary/10 rounded px-2 py-0.5">
                            Réponse admin
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-muted-foreground/80 uppercase tracking-wide text-[10px]">Statut</span>
                        {statusColumn?.render(ticket)}
                      </div>
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-muted-foreground/80 uppercase tracking-wide text-[10px]">Priorité</span>
                        {priorityColumn?.render(ticket)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:flex sm:flex-col sm:gap-0">
              <div className={cn(
                'grid items-center gap-0.5 px-3 py-1 mb-1 rounded-md border border-border/60 bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-white',
                DESKTOP_GRID_TEMPLATE
              )}>
                {columnsConfig.map((col) => (
                  <div key={`header-${col.key}`} className={cn('flex', col.headerClassName)}>
                    {col.key === 'select' ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/5">
                        <Checkbox
                          checked={listFullySelected}
                          onCheckedChange={handleSelectAllForList}
                          className="h-3.5 w-3.5 border-primary/40"
                        />
                      </span>
                    ) : (
                      col.header
                    )}
                  </div>
                ))}
              </div>
              {ticketList.map((ticket) => {
                const isSelected = selectedIds.has(ticket.id);
                const hasNewReply = ticket.hasNewAdminReply && !editMode;
                const rowClasses = cn(
                  'group relative grid items-center gap-0.5 px-3 py-0.5 rounded-md transition-all duration-200 cursor-pointer hover:bg-muted/30 motion-safe:hover:shadow-sm',
                  DESKTOP_GRID_TEMPLATE,
                  isSelected && 'bg-muted/20 ring-1 ring-primary/30',
                  hasNewReply && 'bg-primary/10 dark:bg-primary/20 animate-[pulse_1.6s_ease-in-out_infinite]'
                );

                return (
                  <div
                    key={ticket.id}
                    className={rowClasses}
                    onClick={() => {
                      if (editMode) return;
                      if (ticket.hasNewAdminReply) {
                        setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, hasNewAdminReply: false } : t));
                      }
                      navigate(`/ticket/${ticket.id}`);
                    }}
                  >
                    <span className="pointer-events-none absolute inset-0 -skew-x-6 rounded-md bg-gradient-to-r from-transparent via-primary/8 to-transparent translate-x-[-100%] opacity-0 transition-all duration-500 motion-safe:group-hover:translate-x-[100%] motion-safe:group-hover:opacity-100" />
                    {columnsConfig.map((col) => (
                      <div key={`${ticket.id}-${col.key}`} className={cn('min-w-0', col.cellClassName)}>
                        {col.render(ticket)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        );
      };
      const renderContent = () => {
        const effectiveLoading = loading || (!editMode && permissionsLoading && !hasLoadedOnceRef.current);
        if (effectiveLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
        if (error) return <div className="flex flex-col justify-center items-center h-40 text-destructive"><AlertCircle className="w-8 h-8 mb-2" /><p>{error}</p></div>;
        
        return (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="inProgress" className="mt-0">
              {renderTicketTable(editMode ? [demoInProgressTicket] : inProgressTickets)}
            </TabsContent>
            <TabsContent value="archived" className="mt-0">
              {renderTicketTable(editMode ? [demoArchivedTicket] : archivedTickets)}
            </TabsContent>
          </Tabs>
        );
      };

  return (
    <Card className="h-full flex flex-col glass-effect">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-3">
          <ModuleHeader
            title="Mes Tickets"
            Icon={Ticket}
            variant="slate"
          />
          {!editMode && (
            <Button
              size="sm"
              onClick={() => navigate('/nouveau-ticket')}
              className="ml-auto bg-green-600/90 hover:bg-green-700 text-white h-9 px-3 text-xs font-medium rounded-full shadow-sm transition-all duration-200 hover:shadow"
            >
              <PlusCircle className="h-3 w-3 mr-1.5" />
              Créer un ticket
            </Button>
          )}
        </div>
      </CardHeader>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="inline-flex h-7 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-auto">
                <TabsTrigger value="inProgress" className="text-xs px-2 py-1">En cours</TabsTrigger>
                <TabsTrigger value="archived" className="text-xs px-2 py-1">Archivés</TabsTrigger>
              </TabsList>
            </Tabs>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={handleBulkDuplicate} className="h-6 w-6 p-0">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Dupliquer</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Supprimer</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
      </div>
      <CardContent className="flex-grow p-4 pt-0 overflow-visible">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default TicketsPanel;

