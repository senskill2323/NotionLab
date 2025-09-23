import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send, ArrowLeft, Save, FileText, Calendar, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import ReplyCard from '@/components/ReplyCard';

const ManageTicketPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const markViewInFlightRef = useRef(false);

  const markTicketAsViewed = useCallback(async (ticketId) => {
    if (!ticketId) return;
    if (markViewInFlightRef.current) return;
    markViewInFlightRef.current = true;
    const nowIso = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ admin_last_viewed_at: nowIso })
        .eq('id', ticketId);

      if (error) {
        console.error('Error marking ticket as viewed by admin:', error);
      }
    } catch (err) {
      console.error('Unexpected error while marking ticket as viewed by admin:', err);
    } finally {
      markViewInFlightRef.current = false;
    }
  }, []);

  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTicketData = useCallback(async () => {
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *, 
          profile:user_id(email, user_types(type_name)), 
          assignee:assigned_to(id, email, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);
      setSummary(ticketData.summary || '');
      markTicketAsViewed(ticketData.id);

      const { data: repliesData, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('*, profile:user_id(email, user_types(type_name))')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;
      setReplies(repliesData);

      const { data: adminsData, error: adminsError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, user_types!inner(type_name)')
        .in('user_types.type_name', ['admin', 'prof', 'owner']);
      
      if (adminsError) throw adminsError;
      setAdmins(adminsData);

    } catch (err) {
      setError(err.message);
      toast({ title: "Erreur", description: "Impossible de charger les données du ticket.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast, markTicketAsViewed]);

  useEffect(() => {
    fetchTicketData();
  }, [fetchTicketData]);

  useEffect(() => {
    if (!id) return;

    const handleNewReply = async (payload) => {
      const { data: newReplyData, error } = await supabase
        .from('ticket_replies')
        .select('*, profile:user_id(email, user_types(type_name))')
        .eq('id', payload.new.id)
        .single();

      if (!error && newReplyData) {
        setReplies(prevReplies => [...prevReplies, newReplyData]);
        markTicketAsViewed(id);
      }
    };

    const handleTicketUpdate = (payload) => {
      setTicket(currentTicket => ({...currentTicket, ...payload.new}));
    };

    const repliesChannel = supabase
      .channel(`public:ticket_replies:ticket_id=eq.${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_replies', filter: `ticket_id=eq.${id}` }, handleNewReply)
      .subscribe();
      
    const ticketUpdateChannel = supabase
      .channel(`public:tickets:id=eq.${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${id}` }, handleTicketUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(repliesChannel);
      supabase.removeChannel(ticketUpdateChannel);
    };
  }, [id, markTicketAsViewed]);

  const handleUpdate = async (field, value) => {
    const { error } = await supabase
      .from('tickets')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      toast({ title: "Erreur", description: `Impossible de mettre à jour le champ ${field}.`, variant: "destructive" });
      return false;
    } else {
      // Optimistic update handled by realtime listener
      toast({ title: "Succès", description: `Champ ${field} mis à jour.` });
      return true;
    }
  };

  const handleStatusChange = (newStatus) => handleUpdate('status', newStatus);
  const handleAssigneeChange = (newAssigneeId) => {
    const valueToSend = newAssigneeId === 'unassigned' ? null : newAssigneeId;
     handleUpdate('assigned_to', valueToSend).then(success => {
      if (success) {
         const newAssignee = admins.find(a => a.id === newAssigneeId);
         setTicket(prev => ({...prev, assignee: newAssignee || null, assigned_to: valueToSend}));
      }
    });
  };
  const handlePriorityChange = (newPriority) => handleUpdate('priority', newPriority);
  
  const handleSummarySave = async () => {
    await handleUpdate('summary', summary);
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim() || !user) return;

    const { error } = await supabase
      .from('ticket_replies')
      .insert({
        ticket_id: id,
        user_id: user.id,
        content: newReply,
      });

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer la réponse.", variant: "destructive" });
    } else {
      setNewReply('');
      if (ticket.status === 'A traiter') {
        await handleUpdate('status', 'En cours');
      }
      toast({ title: "Succès", description: "Réponse envoyée." });
    }
  };

  const getBadgeConfig = (status) => {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-destructive mb-4">Erreur : {error}</p>
        <Button onClick={() => navigate('/admin/dashboard?tab=tickets')}>Retour au tableau de bord</Button>
      </div>
    );
  }

  const initialPost = {
    content: ticket.description,
    created_at: ticket.created_at,
    profile: ticket.profile,
    user_id: ticket.user_id,
    isInitial: true,
  };

  return (
    <>
      <Helmet>
        <title>{`Gérer le Ticket ${ticket?.reference_number || ''} | Notion Pro`}</title>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard?tab=tickets')} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux tickets
            </Button>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <Card className="glass-effect">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl flex items-center gap-2">
                          <span className="text-primary">{ticket.reference_number}</span>
                          <span>{ticket.title}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <Calendar className="w-4 h-4" />
                          Créé le: {new Date(ticket.created_at).toLocaleString('fr-FR')} par {ticket.profile.email}
                        </CardDescription>
                      </div>
                      <Badge className={getBadgeConfig(ticket.status)}>{ticket.status}</Badge>
                    </div>
                  </CardHeader>
                </Card>

                <div className="space-y-4">
                  <ReplyCard reply={initialPost} currentUserId={user?.id} ticketOwnerId={ticket?.user_id} />
                  {replies.map(reply => (
                    <ReplyCard key={reply.id} reply={reply} currentUserId={user?.id} ticketOwnerId={ticket?.user_id} />
                  ))}
                </div>

                <Card className="glass-effect">
                  <CardHeader>
                    <CardTitle>Répondre</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddReply}>
                      <Textarea
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        placeholder="Votre réponse..."
                        className="mb-2"
                        rows={5}
                      />
                      <Button type="submit" className="notion-gradient text-white" disabled={!newReply.trim()}>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-1 space-y-6">
                <Card className="glass-effect">
                  <CardHeader>
                    <CardTitle>Détails du Ticket</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Statut</label>
                      <Select value={ticket.status} onValueChange={handleStatusChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A traiter">À traiter</SelectItem>
                          <SelectItem value="En cours">En cours</SelectItem>
                          <SelectItem value="Résolu">Résolu</SelectItem>
                          <SelectItem value="Abandonné">Abandonné</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assigné à</label>
                      <Select value={ticket.assigned_to || 'unassigned'} onValueChange={handleAssigneeChange}>
                        <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Non assigné</SelectItem>
                          {admins.map(admin => (
                            <SelectItem key={admin.id} value={admin.id}>
                              {admin.first_name} {admin.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1">
                        <ShieldAlert className="w-4 h-4" /> Priorité
                      </label>
                      <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bas">Bas</SelectItem>
                          <SelectItem value="Moyen">Moyen</SelectItem>
                          <SelectItem value="Haut">Haut</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-effect">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Résumé interne
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Ajouter un résumé pour l'équipe..."
                      className="mb-2"
                      rows={5}
                    />
                    <Button onClick={handleSummarySave} size="sm">
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer le résumé
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default ManageTicketPage;
