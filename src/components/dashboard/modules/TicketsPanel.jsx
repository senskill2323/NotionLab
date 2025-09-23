import React, { useState, useEffect, useCallback, useRef } from 'react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useNavigate } from 'react-router-dom';
    import { Card, CardHeader, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { Loader2, PlusCircle, AlertCircle, Inbox, User, Ticket, Copy, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
    import { useToast } from '@/components/ui/use-toast';
    import { usePermissions } from '@/contexts/PermissionsContext';
    import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
    import ModuleHeader from '@/components/dashboard/ModuleHeader';

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
          case 'Résolu': return 'bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200';
          case 'Fermé': case 'Abandonné': return 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200';
          default: return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
      };

      const getPriorityBadgeConfig = (priority) => {
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
      const canChangePriority = permissions && permissions['tickets:change_priority'];

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

      const handleSelectAll = () => {
        const currentTickets = activeTab === 'inProgress' ? inProgressTickets : archivedTickets;
        if (selectedIds.size === currentTickets.length && currentTickets.length > 0) {
          setSelectedIds(new Set());
        } else {
          setSelectedIds(new Set(currentTickets.map(t => t.id)));
        }
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

      const archivedStatuses = ['Résolu', 'Abandonné', 'Fermé'];
      const inProgressTickets = tickets.filter(t => !archivedStatuses.includes(t.status));
      const archivedTickets = tickets.filter(t => archivedStatuses.includes(t.status));
      
      const demoInProgressTicket = {id: 1, reference_number: 'CS-031', title: "Exemple de ticket en cours", status: "En cours", priority: "Haut", created_at: new Date().toISOString(), assigned_to_profile: { first_name: 'Yann', last_name: 'V.' } };
      const demoArchivedTicket = {id: 2, reference_number: 'CS-030', title: "Exemple de ticket archivé", status: "Résolu", priority: "Bas", created_at: new Date(Date.now() - 86400000).toISOString(), assigned_to_profile: { first_name: 'Yann', last_name: 'V.' } };

      // Single source of truth for headers and cells to prevent any misalignment
      const columnsConfig = [
        {
          key: 'select',
          header: '',
          className: 'w-8',
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
          header: 'N° de ticket',
          className: 'font-mono text-xs text-muted-foreground w-20',
          render: (ticket) => ticket.reference_number || '-'
        },
        {
          key: 'title',
          header: 'Description du ticket',
          className: 'font-normal truncate',
          render: (ticket) => (
            <div className="flex items-center gap-2">
              <span className="truncate max-w-[220px] lg:max-w-[280px]">{ticket.title}</span>
              {ticket.hasNewAdminReply && !editMode && (
                <span className="text-[10px] uppercase tracking-wide font-semibold text-primary border border-primary/40 bg-primary/10 rounded px-2 py-0.5">
                  Reponse admin
                </span>
              )}
            </div>
          )
        },
        {
          key: 'status',
          header: 'Statut',
          className: 'w-32',
          render: (ticket) => (
            <Select
              defaultValue={ticket.status}
              onValueChange={(newStatus) => handleFieldChange(ticket.id, 'status', newStatus)}
              disabled={editMode}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectTrigger className="h-7 w-28 text-xs border-none shadow-none focus:ring-1 focus:ring-primary/20 [&>svg]:hidden">
                <SelectValue asChild>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 border-none ${getStatusBadgeConfig(ticket.status)}`}>
                    {ticket.status}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-[120px]">
                <SelectItem value="A traiter">À traiter</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Résolu">Résolu</SelectItem>
                <SelectItem value="Fermé">Fermé</SelectItem>
                <SelectItem value="Abandonné">Abandonné</SelectItem>
              </SelectContent>
            </Select>
          )
        },
        {
          key: 'priority',
          header: 'Priorité',
          className: 'w-24',
          render: (ticket) => (
            <Select
              defaultValue={ticket.priority}
              onValueChange={(newPriority) => handleFieldChange(ticket.id, 'priority', newPriority)}
              disabled={editMode}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectTrigger className="h-7 w-20 text-xs border-none shadow-none focus:ring-1 focus:ring-primary/20 [&>svg]:hidden">
                <SelectValue asChild>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 border-none ${getPriorityBadgeConfig(ticket.priority)}`}>
                    {ticket.priority}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-[100px]">
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
          className: 'text-xs w-20',
          render: (ticket) => formatDate(ticket.created_at)
        },
        {
          key: 'time',
          header: 'Heure',
          className: 'text-xs w-16',
          render: (ticket) => formatTime(ticket.created_at)
        }
      ];

      const renderTicketTable = (ticketList) => {
        if (ticketList.length === 0) {
          return (
            <div className="flex flex-col justify-center items-center h-40 text-muted-foreground">
              <Inbox className="w-8 h-8 mb-2" />
              <p>Aucun ticket dans cette catégorie.</p>
            </div>
          );
        }
        return (
          <Table>
            <colgroup>
              <col className="w-8" />
              <col className="w-20" />
              <col />
              <col className="w-32" />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-16" />
            </colgroup>
            <TableHeader>
              <TableRow>
                {columnsConfig.map(col => (
                  <TableHead key={`head-${col.key}`} className={col.className}>{col.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketList.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className={`group cursor-pointer transition-colors hover:bg-muted/30 motion-safe:hover:shadow-sm ${ticket.hasNewAdminReply && !editMode ? 'bg-primary/10 dark:bg-primary/20 animate-[pulse_1.6s_ease-in-out_infinite]' : ''}`}
                  onClick={() => {
                    if (editMode) return;
                    if (ticket.hasNewAdminReply) {
                      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, hasNewAdminReply: false } : t));
                    }
                    navigate(`/ticket/${ticket.id}`);
                  }}
                >
                  {columnsConfig.map((col) => (
                    <TableCell key={`${ticket.id}-${col.key}`} className={col.className}>
                      {col.render(ticket)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <div className="flex items-center justify-between">
          <ModuleHeader
            title="Mes Tickets"
            Icon={Ticket}
            variant="slate"
          />
          {!editMode && (
            <Button 
              size="sm" 
              onClick={() => navigate('/nouveau-ticket')} 
              className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
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
            <div className="flex items-center gap-2">
              <Checkbox
                checked={(() => {
                  const currentTickets = activeTab === 'inProgress' ? inProgressTickets : archivedTickets;
                  return currentTickets.length > 0 && selectedIds.size === currentTickets.length;
                })()}
                onCheckedChange={handleSelectAll}
                className="h-4 w-4"
              />
              <span className="text-xs text-muted-foreground">Tout sélectionner</span>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1 ml-2">
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

