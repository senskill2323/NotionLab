import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send, ArrowLeft, CheckCircle, AlertCircle, Calendar, Download, ShieldAlert, User, Clock, PackageX } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReplyCard from '@/components/ReplyCard';
import Papa from 'papaparse';
import { Badge } from '@/components/ui/badge';

const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const markViewInFlightRef = useRef(false);

  const markTicketAsViewed = useCallback(async (ticketId, ticketOwnerId) => {
    if (!user?.id || !ticketId) return;
    if (ticketOwnerId && ticketOwnerId !== user.id) return;
    if (markViewInFlightRef.current) return;
    markViewInFlightRef.current = true;
    const nowIso = new Date().toISOString();

    try {
      const { error: markError } = await supabase
        .from('tickets')
        .update({ client_last_viewed_at: nowIso })
        .eq('id', ticketId)
        .eq('user_id', user.id);

      if (markError) {
        console.error('Error marking ticket as viewed:', markError);
      }
    } catch (viewErr) {
      console.error('Unexpected error while marking ticket as viewed:', viewErr);
    } finally {
      markViewInFlightRef.current = false;
    }
  }, [user]);

  const [error, setError] = useState(null);

  const fetchTicketData = useCallback(async () => {
    setLoading(true);

    // Add a timeout guard to avoid infinite loading if network hangs
    const withTimeout = (p, ms = 8000) => Promise.race([
      p,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de chargement')), ms))
    ]);

    try {
      const ticketPromise = supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      const { data: ticketData, error: ticketError } = await withTimeout(ticketPromise);
      if (ticketError) throw new Error("Ticket non trouvé ou accès non autorisé.");
      setTicket(ticketData);
      markTicketAsViewed(ticketData.id, ticketData.user_id);

      const repliesPromise = supabase
        .from('ticket_replies')
        .select('*, profile:user_id(email, user_types(type_name))')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      const { data: repliesData, error: repliesError } = await withTimeout(repliesPromise);
      if (repliesError) throw repliesError;
      setReplies(repliesData);

    } catch (err) {
      console.error('TicketDetailPage load error:', err);
      setError(err.message || 'Erreur de chargement du ticket.');
      toast({ title: "Erreur", description: err.message || 'Erreur de chargement du ticket.', variant: "destructive" });
      // Do not navigate away; show the error on this page so user understands
    } finally {
      setLoading(false);
    }
  }, [id, toast, markTicketAsViewed]);

  useEffect(() => {
    fetchTicketData();
  }, [fetchTicketData]);

  useEffect(() => {
    if (ticket?.id) {
      markTicketAsViewed(ticket.id, ticket.user_id);
    }
  }, [ticket?.id, ticket?.user_id, markTicketAsViewed]);

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
        markTicketAsViewed(id, ticket?.user_id || user?.id);
      }
    };

    const handleTicketUpdate = (payload) => {
      setTicket(currentTicket => ({...currentTicket, ...payload.new}));
    };

    const repliesChannel = supabase
      .channel(`public:ticket_replies:ticket_id=eq.${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ticket_replies', 
        filter: `ticket_id=eq.${id}` 
      }, handleNewReply)
      .subscribe();
  
    const ticketUpdateChannel = supabase
      .channel(`public:tickets:id=eq.${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'tickets', 
        filter: `id=eq.${id}` 
      }, handleTicketUpdate)
      .subscribe();
  
    return () => {
      supabase.removeChannel(repliesChannel);
      supabase.removeChannel(ticketUpdateChannel);
    };
  }, [id]);

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim() || !user) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from('ticket_replies')
      .insert({ ticket_id: id, user_id: user.id, content: newReply });

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer la réponse.", variant: "destructive" });
    } else {
      setNewReply('');
      toast({ title: "Succès", description: "Réponse envoyée.", className: 'bg-green-500 text-white' });
      
      const closedStatuses = ['Résolu', 'Abandonné'];
      if (closedStatuses.includes(ticket.status)) {
        await handleStatusChange('En cours');
        toast({ title: "Ticket ré-ouvert", description: "Le statut du ticket est maintenant 'En cours'." });
      }
    }
    setIsSubmitting(false);
  };
  
  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === ticket.status) return;

    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    } else {
      toast({ title: "Statut mis à jour !", description: `Le ticket est maintenant: ${newStatus}`, className: 'bg-green-500 text-white'});
    }
  };
  
  const handleExportCSV = () => {
    if (!ticket || !replies || !user) return;
  
    const dataForExport = [];
  
    dataForExport.push({
      Date: new Date(ticket.created_at).toLocaleString('fr-FR'),
      Auteur: user.email,
      Message: ticket.description
    });
  
    replies.forEach(reply => {
      dataForExport.push({
        Date: new Date(reply.created_at).toLocaleString('fr-FR'),
        Auteur: reply.profile.user_types.type_name === 'client' ? reply.profile.email : 'Support Notion Pro',
        Message: reply.content
      });
    });
  
    const csv = Papa.unparse(dataForExport, {
      header: true,
      quotes: true,
      delimiter: ";"
    });
  
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ticket-${ticket.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  
    toast({ title: "Exportation réussie", description: "Le fichier CSV a été téléchargé." });
  };

  const getStatusBadge = (status) => {
    let icon, className, text;
    switch (status) {
      case 'A traiter':
        text = 'À traiter';
        className = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        icon = <Clock className="w-4 h-4 mr-2" />;
        break;
      case 'En cours':
      case 'Répondu':
        text = 'En cours';
        className = 'bg-orange-200 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200';
        icon = <Clock className="w-4 h-4 mr-2" />;
        break;
      case 'Résolu':
        text = 'Résolu';
        className = 'bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200';
        icon = <CheckCircle className="w-4 h-4 mr-2" />;
        break;
      case 'Abandonné':
        text = 'Abandonné';
        className = 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200';
        icon = <PackageX className="w-4 h-4 mr-2" />;
        break;
      default:
        text = status;
        className = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        icon = <AlertCircle className="w-4 h-4 mr-2" />;
    }
    return (
        <span className={`inline-flex items-center text-base font-medium py-1 px-3 rounded-full border-none ${className}`}>
            {icon}
            {text}
        </span>
    );
  };
  
  const getPriorityBadge = (priority) => {
    const styles = {
      'Bas': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      'Moyen': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      'Haut': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      'Urgent': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 font-bold',
    };
    return (
      <Badge variant="outline" className={`font-medium py-1 px-3 text-base border-none ${styles[priority] || styles['Moyen']}`}>
        <ShieldAlert className="w-4 h-4 mr-2" />
        {priority}
      </Badge>
    );
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (error || !ticket) return <div className="text-center py-40">Erreur: {error || 'Ticket introuvable.'}</div>;

  return (
    <>
      <Helmet><title>Ticket #{ticket.id.toString().padStart(4, '0')}</title></Helmet>
      <div className="min-h-screen">
        <main className="container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au tableau de bord
              </Button>
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter en CSV
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Marquer comme:</span>
                  <Select onValueChange={handleStatusChange} value={ticket.status}>
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Changer le statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En cours">En cours (j'ai une autre question)</SelectItem>
                      <SelectItem value="Résolu">Résolu (problème réglé)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Card className="glass-effect mb-6">
              <CardHeader>
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <span className="text-primary">#{ticket.id.toString().padStart(4, '0')}</span>
                      <span>{ticket.title}</span>
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Créé le: {new Date(ticket.created_at).toLocaleString('fr-FR')}
                      </CardDescription>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            <div className="space-y-4 mb-6">
              {replies.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  currentUserId={user?.id}
                  ticketOwnerId={ticket.user_id}
                />
              ))}
            </div>

            <div className="flex gap-4 items-start mt-8">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <form onSubmit={handleAddReply} className="flex-grow">
                <Textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder={['Résolu', 'Abandonné'].includes(ticket.status) ? "Envoyer une réponse pour ré-ouvrir le ticket..." : "Votre réponse..."}
                  className="w-full"
                  rows={4}
                  disabled={isSubmitting}
                />
                <div className="flex justify-end mt-2">
                  <Button type="submit" className="notion-gradient text-white" disabled={isSubmitting || !newReply.trim()}>
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                    Envoyer
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default TicketDetailPage;

