import React, { useState, useEffect, useCallback } from 'react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useNavigate } from 'react-router-dom';
    import { motion, AnimatePresence } from 'framer-motion';
    import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { Loader2, PlusCircle, AlertCircle, Inbox, User } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';
    import { usePermissions } from '@/contexts/PermissionsContext';
    import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

    const TicketsPanel = ({ editMode = false }) => {
      const { user } = useAuth();
      const [tickets, setTickets] = useState([]);
      const [assignedUsers, setAssignedUsers] = useState({});
      const [loading, setLoading] = useState(!editMode);
      const [error, setError] = useState(null);
      const navigate = useNavigate();
      const { toast } = useToast();
      const { permissions, loading: permissionsLoading } = usePermissions();

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
        setLoading(true);
        setError(null);

        try {
            const { data, error: ticketsError } = await supabase
              .from('tickets')
              .select('*, assigned_to_profile:profiles!tickets_assigned_to_fkey(id, first_name, last_name)')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (ticketsError) throw ticketsError;
            
            setTickets(data);
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

      const archivedStatuses = ['Résolu', 'Abandonné', 'Fermé'];
      const inProgressTickets = tickets.filter(t => !archivedStatuses.includes(t.status));
      const archivedTickets = tickets.filter(t => archivedStatuses.includes(t.status));
      
      const demoInProgressTicket = {id: 1, title: "Exemple de ticket en cours", priority: "Haut", status: "En cours", reference_number: 'CS-031', created_at: new Date().toISOString(), assigned_to_profile: { first_name: 'Yann', last_name: 'V.' } };
      const demoArchivedTicket = {id: 2, title: "Exemple de ticket archivé", priority: "Bas", status: "Résolu", reference_number: 'CS-030', created_at: new Date(Date.now() - 86400000).toISOString(), assigned_to_profile: { first_name: 'Yann', last_name: 'V.' } };

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
            <TableHeader>
              <TableRow>
                <TableHead>Réf.</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Assigné à</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {ticketList.map((ticket) => (
                  <motion.tr
                    key={ticket.id}
                    layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="cursor-pointer"
                    onClick={() => !editMode && navigate(`/ticket/${ticket.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{ticket.reference_number}</TableCell>
                    <TableCell className="font-medium">{ticket.title}</TableCell>
                    <TableCell>
                      <Select defaultValue={ticket.status} onValueChange={(newStatus) => handleFieldChange(ticket.id, 'status', newStatus)} disabled={editMode || !canChangeStatus} onClick={(e) => e.stopPropagation()}>
                        <SelectTrigger hideArrow={true} className="h-auto w-auto p-0 border-none focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-transparent data-[state=open]:text-current bg-transparent">
                          <SelectValue asChild><Badge variant="outline" className={`cursor-pointer text-xs px-2 py-1 border-none ${getStatusBadgeConfig(ticket.status)}`}>{ticket.status}</Badge></SelectValue>
                        </SelectTrigger>
                        <SelectContent><SelectItem value="A traiter">À traiter</SelectItem><SelectItem value="En cours">En cours</SelectItem><SelectItem value="Résolu">Résolu</SelectItem><SelectItem value="Fermé">Fermé</SelectItem><SelectItem value="Abandonné">Abandonné</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select defaultValue={ticket.priority} onValueChange={(newPriority) => handleFieldChange(ticket.id, 'priority', newPriority)} disabled={editMode || !canChangePriority} onClick={(e) => e.stopPropagation()}>
                        <SelectTrigger hideArrow={true} className="h-auto w-auto p-0 border-none focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-transparent data-[state=open]:text-current bg-transparent">
                          <SelectValue asChild><Badge variant="outline" className={`cursor-pointer text-xs px-2 py-1 border-none ${getPriorityBadgeConfig(ticket.priority)}`}>{ticket.priority}</Badge></SelectValue>
                        </SelectTrigger>
                        <SelectContent><SelectItem value="Bas">Bas</SelectItem><SelectItem value="Moyen">Moyen</SelectItem><SelectItem value="Haut">Haut</SelectItem><SelectItem value="Urgent">Urgent</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(ticket.created_at)}</TableCell>
                    <TableCell className="text-xs">{formatTime(ticket.created_at)}</TableCell>
                    <TableCell>
                      {ticket.assigned_to_profile ? (
                        <TooltipProvider>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="font-normal">
                                  <User className="h-3 w-3 mr-1.5" />
                                  {ticket.assigned_to_profile.first_name} {ticket.assigned_to_profile.last_name?.charAt(0)}.
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent><p>{ticket.assigned_to_profile.first_name} {ticket.assigned_to_profile.last_name}</p></TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                      ) : ( <Badge variant="outline" className="font-normal">Non assigné</Badge> )}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        );
      };

      const renderContent = () => {
        if (loading || (!editMode && permissionsLoading)) return <div className="flex justify-center items-center h-40"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
        if (error) return <div className="flex flex-col justify-center items-center h-40 text-destructive"><AlertCircle className="w-8 h-8 mb-2" /><p>{error}</p></div>;
        
        return (
          <Tabs defaultValue="inProgress" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inProgress">En cours</TabsTrigger>
              <TabsTrigger value="archived">Archivés</TabsTrigger>
            </TabsList>
            <TabsContent value="inProgress">
              {renderTicketTable(editMode ? [demoInProgressTicket] : inProgressTickets)}
            </TabsContent>
            <TabsContent value="archived">
              {renderTicketTable(editMode ? [demoArchivedTicket] : archivedTickets)}
            </TabsContent>
          </Tabs>
        );
      };

      return (
        <Card className="h-full flex flex-col glass-effect">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Mes Tickets</span>
              {canCreateTickets && !editMode && (
                <Button size="sm" onClick={() => navigate('/nouveau-ticket')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nouveau Ticket
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow p-4">
            {renderContent()}
          </CardContent>
        </Card>
      );
    };

    export default TicketsPanel;