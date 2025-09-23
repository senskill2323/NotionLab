import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Loader2, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

const TicketManagementPanel = ({ onDataChange }) => {
  const [tickets, setTickets] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const [activeTab, setActiveTab] = useState('en-cours');
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsResponse, usersResponse] = await Promise.all([
        supabase
          .from('tickets')
          .select(`
            id, created_at, title, status, priority, client_email, reference_number,
            user_id, assigned_to, client_last_viewed_at, admin_last_viewed_at,
            profile:profiles!tickets_user_id_fkey ( id, email, user_types(type_name) ),
            assignee:profiles!tickets_assigned_to_fkey ( id, email, first_name, last_name )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, email, first_name, last_name, user_types!inner(type_name)')
          .in('user_types.type_name', ['admin', 'prof', 'owner'])
      ]);

      if (ticketsResponse.error) throw ticketsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      
      let ticketsData = ticketsResponse.data || [];

      if (ticketsData.length > 0) {
        try {
          const ticketIds = ticketsData.map((ticket) => ticket.id).filter(Boolean);
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

              const clientRoles = new Set(['client', 'vip']);

              ticketsData = ticketsData.map((ticket) => {
                const latestReply = latestReplyByTicket.get(ticket.id);
                const authorRole = latestReply?.profile?.user_types?.type_name;
                const replyAuthorId = latestReply?.user_id || null;
                const isClientAuthor = !!latestReply && (
                  clientRoles.has(authorRole) || (replyAuthorId && replyAuthorId === ticket.user_id)
                );
                const hasNewClientReply =
                  isClientAuthor &&
                  (!ticket.admin_last_viewed_at || new Date(latestReply.created_at) > new Date(ticket.admin_last_viewed_at));

                return { ...ticket, hasNewClientReply };
              });
            }
          }
        } catch (metaErr) {
          console.error('Error enriching tickets with reply metadata:', metaErr);
        }
      }

      setTickets(ticketsData);
      setAssignableUsers(usersResponse.data || []);
      
      if (onDataChange) {
        onDataChange(ticketsData);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
      toast({ title: "Erreur", description: "Impossible de charger les données.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, onDataChange]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const handleTicketChange = (payload) => {
      console.log('Realtime ticket change received:', payload);
      fetchInitialData();
    };

    const ticketsChannel = supabase
      .channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, handleTicketChange)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to tickets channel!');
        }
        if (err) {
          console.error('Subscription error on tickets channel:', err);
        }
      });

    return () => {
      supabase.removeChannel(ticketsChannel);
    };
  }, [fetchInitialData]);

  const getStatusBadgeConfig = (status) => {
    switch (status) {
      case 'A traiter':
        return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'En cours':
        return 'bg-orange-200 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200';
      case 'Résolu':
        return 'bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200';
      case 'Abandonné':
        return 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200';
      default:
        return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };
  
  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'Bas': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'Moyen': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'Haut': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'Urgent': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    }
  };
  
  const handleViewTicket = (ticketId) => {
    setTickets(prev => {
      const next = prev.map(t => t.id === ticketId ? { ...t, hasNewClientReply: false } : t);
      if (onDataChange) onDataChange(next);
      return next;
    });
    navigate(`/admin/ticket/${ticketId}`);
  };

  const handleFieldChange = async (ticketId, field, value) => {
    const { error } = await supabase
      .from('tickets')
      .update({ [field]: value })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: `Impossible de mettre à jour le champ ${field}.`, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: `Le ticket a été mis à jour.` });
    }
  };

  const filteredTickets = useMemo(() => {
    const openStatuses = ['A traiter', 'En cours', 'Répondu'];
    const closedStatuses = ['Résolu', 'Abandonné'];
    
    if (activeTab === 'en-cours') {
      return tickets.filter(t => openStatuses.includes(t.status));
    }
    if (activeTab === 'archives') {
      return tickets.filter(t => closedStatuses.includes(t.status));
    }
    return tickets;
  }, [tickets, activeTab]);

  const groupedTickets = useMemo(() => {
    const sortedFilteredTickets = [...filteredTickets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (groupBy === 'none') {
        return { 'all_tickets': sortedFilteredTickets };
    }

    return sortedFilteredTickets.reduce((acc, ticket) => {
      let key;
      if (groupBy === 'user') {
        key = ticket.profile?.email || ticket.client_email || 'Utilisateur inconnu';
      } else if (groupBy === 'assignee') {
        key = ticket.assignee?.email || 'Non assigné';
      } else if (groupBy === 'status') {
        key = ticket.status;
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(ticket);
      return acc;
    }, {});
  }, [filteredTickets, groupBy]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return <p className="text-destructive">Erreur : {error}</p>;
  }

  const renderTicketsTable = (ticketsToRender) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Réf.</TableHead>
          <TableHead className="w-[130px]">Statut</TableHead>
          <TableHead className="w-[120px]">Priorité</TableHead>
          <TableHead className="w-[200px]">Utilisateur</TableHead>
          <TableHead className="w-[200px]">Assigné à</TableHead>
          <TableHead>Titre</TableHead>
          <TableHead className="w-[110px]">Date</TableHead>
          <TableHead className="w-[80px]">Heure</TableHead>
          <TableHead className="w-[80px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      {Object.entries(ticketsToRender).map(([groupName, groupTickets]) => (
        <TableBody key={groupName}>
          {groupBy !== 'none' && (
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableCell colSpan={9} className="font-bold text-primary py-2 px-4">{groupName} ({groupTickets.length})</TableCell>
            </TableRow>
          )}
          {groupTickets.length === 0 ? (
             <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Aucun ticket à afficher.</TableCell></TableRow>
          ) : groupTickets.map((ticket) => (
            <TableRow key={ticket.id} className={`group cursor-pointer transition-colors hover:bg-muted/30 motion-safe:hover:shadow-sm ${ticket.hasNewClientReply ? 'bg-amber-100/60 dark:bg-amber-500/10 animate-[pulse_1.6s_ease-in-out_infinite]' : ''}`}>
              <TableCell>{ticket.reference_number}</TableCell>
              <TableCell>
                <Select value={ticket.status} onValueChange={(newStatus) => handleFieldChange(ticket.id, 'status', newStatus)}>
                  <SelectTrigger hideArrow={true} className="h-auto w-auto p-0 border-none focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-transparent data-[state=open]:text-current">
                    <SelectValue asChild>
                      <Badge variant="outline" className={`cursor-pointer text-xs px-2 py-1 border-none ${getStatusBadgeConfig(ticket.status)}`}>
                        {ticket.status}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A traiter">À traiter</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Résolu">Résolu</SelectItem>
                    <SelectItem value="Abandonné">Abandonné</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select value={ticket.priority} onValueChange={(newPriority) => handleFieldChange(ticket.id, 'priority', newPriority)}>
                  <SelectTrigger hideArrow={true} className="h-auto w-auto p-0 border-none focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-transparent data-[state=open]:text-current">
                    <SelectValue asChild>
                      <Badge variant="outline" className={`cursor-pointer text-xs px-2 py-1 border-none ${getPriorityBadgeVariant(ticket.priority)}`}>
                        {ticket.priority}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bas">Bas</SelectItem>
                    <SelectItem value="Moyen">Moyen</SelectItem>
                    <SelectItem value="Haut">Haut</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="truncate">{ticket.profile?.email || ticket.client_email || 'N/A'}</TableCell>
              <TableCell>
                <Select value={ticket.assigned_to || 'unassigned'} onValueChange={(newAssignee) => handleFieldChange(ticket.id, 'assigned_to', newAssignee === 'unassigned' ? null : newAssignee)}>
                  <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Non assigné" /></SelectTrigger>
                  <SelectContent><SelectItem value="unassigned">Non assigné</SelectItem>{assignableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>
              <TableCell className="font-medium truncate">
                <div className="flex items-center gap-2">
                  <span className="truncate">{ticket.title}</span>
                  {ticket.hasNewClientReply && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-300 border border-amber-400/60 bg-amber-100/70 dark:bg-amber-500/15 rounded px-2 py-0.5">
                      Réponse client
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</TableCell>
              <TableCell>{new Date(ticket.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleViewTicket(ticket.id)}><Eye className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      ))}
    </Table>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="glass-effect">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des Tickets</CardTitle>
              <CardDescription>Liste de tous les tickets ouverts par les utilisateurs.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="group-by-select">Grouper par</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger id="group-by-select" className="w-[180px]"><SelectValue placeholder="Grouper par..." /></SelectTrigger>
                <SelectContent><SelectItem value="none">Aucun</SelectItem><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="assignee">Assigné à</SelectItem><SelectItem value="status">Statut</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="en-cours">En cours</TabsTrigger>
              <TabsTrigger value="archives">Archivés</TabsTrigger>
            </TabsList>
            <TabsContent value="en-cours" className="mt-4"><div className="overflow-x-auto">{renderTicketsTable(groupedTickets)}</div></TabsContent>
            <TabsContent value="archives" className="mt-4"><div className="overflow-x-auto">{renderTicketsTable(groupedTickets)}</div></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TicketManagementPanel;
