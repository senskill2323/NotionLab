import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Ticket, Plus, Loader2, CheckCircle, Clock, ArrowLeft, PackageX, AlertCircle, HelpCircle, ShieldAlert, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const TicketsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('en-cours');
  const [loading, setLoading] = useState(true);
  const [editingTicket, setEditingTicket] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
    } else {
      fetchTickets();
    }
  }, [user, navigate]);

  useEffect(() => {
    filterTickets();
  }, [activeTab, allTickets]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('id, title, description, status, priority, created_at, user_id, client_email')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
    } else {
      setAllTickets(data || []);
    }
    setLoading(false);
  };

  const updateTicket = async (ticketId, updates) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)
        .eq('user_id', user.id); // Ensure user can only update their own tickets

      if (error) throw error;

      // Update local state
      setAllTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, ...updates } : ticket
      ));

      toast({
        title: "Ticket mis à jour",
        description: "Les modifications ont été enregistrées avec succès.",
      });

      setEditingTicket(null);
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le ticket.",
        variant: "destructive"
      });
    }
  };

  const filterTickets = () => {
    const openStatuses = ['A traiter', 'En cours', 'Répondu'];
    const closedStatuses = ['Résolu', 'Abandonné'];

    if (activeTab === 'en-cours') {
      setFilteredTickets(allTickets.filter(ticket => openStatuses.includes(ticket.status)));
    } else { // 'archives'
      setFilteredTickets(allTickets.filter(ticket => closedStatuses.includes(ticket.status)));
    }
  };
  
  const getPriorityBadge = (priority) => {
    let text, className, icon;
    switch(priority) {
        case 'Faible':
            text = 'Faible';
            className = 'bg-blue-200 text-blue-800 dark:bg-blue-800/50 dark:text-blue-200';
            icon = <HelpCircle className="w-3 h-3 mr-1" />;
            break;
        case 'Moyen':
            text = 'Moyen';
            className = 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-200';
            icon = <AlertCircle className="w-3 h-3 mr-1" />;
            break;
        case 'Élevé':
        case 'Urgent':
            text = priority;
            className = 'bg-red-200 text-red-800 dark:bg-red-800/50 dark:text-red-200';
            icon = <ShieldAlert className="w-3 h-3 mr-1" />;
            break;
        default:
            text = priority || 'Moyen';
            className = 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-200';
            icon = <AlertCircle className="w-3 h-3 mr-1" />;
    }
    return <Badge className={`border-none ${className} flex items-center`}>{icon}{text}</Badge>;
  };

  const getStatusBadge = (status) => {
    let text, className;
    switch(status) {
        case 'A traiter':
            text = 'À traiter';
            className = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            break;
        case 'En cours':
        case 'Répondu':
            text = 'En cours';
            className = 'bg-orange-200 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200';
            break;
        case 'Résolu':
            text = 'Résolu';
            className = 'bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200';
            break;
        case 'Abandonné':
            text = 'Abandonné';
            className = 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200';
            break;
        default:
            text = status;
            className = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
    return <Badge className={`border-none ${className}`}>{text}</Badge>;
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'A traiter':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'En cours':
      case 'Répondu':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'Résolu':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'Abandonné':
        return <PackageX className="w-5 h-5 text-purple-400" />;
      default:
        return <Ticket className="w-5 h-5 text-muted-foreground" />;
    }
  };


  const getTicketCounts = () => {
    return {
      'en-cours': allTickets.filter(t => ['A traiter', 'En cours', 'Répondu'].includes(t.status)).length,
      'archives': allTickets.filter(t => ['Résolu', 'Abandonné'].includes(t.status)).length
    };
  };

  const counts = getTicketCounts();

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Mes Tickets de Support - Espace Client | NotionLab</title>
        <meta name="description" content="Gérez vos tickets de support NotionLab. Posez vos questions sur vos projets Notion et obtenez des réponses d'expert personnalisées." />
      </Helmet>

      <div className="min-h-screen">
        
        <div className="pt-32 pb-16">
          <div className="w-full px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex items-center justify-between mb-8"
            >
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">
                  Mes <span className="gradient-text">Tickets</span>
                </h1>
                <p className="text-xl text-foreground/80">
                  Gérez vos questions et suivez les réponses de notre expert
                </p>
              </div>
              <Link to="/nouveau-ticket">
                <Button className="notion-gradient text-white hover:opacity-90" size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Nouveau ticket
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex justify-between items-center mb-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm">
                  <TabsList className="grid w-full grid-cols-2 bg-secondary">
                    <TabsTrigger value="en-cours">En cours ({counts['en-cours']})</TabsTrigger>
                    <TabsTrigger value="archives">Archivés ({counts['archives']})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Link to="/dashboard">
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour au Dashboard
                  </Button>
                </Link>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TicketsList 
                    tickets={filteredTickets} 
                    getStatusBadge={getStatusBadge} 
                    getPriorityBadge={getPriorityBadge}
                    getStatusIcon={getStatusIcon}
                    loading={loading}
                    activeTab={activeTab}
                    editingTicket={editingTicket}
                    setEditingTicket={setEditingTicket}
                    updateTicket={updateTicket}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

const TicketsList = ({ tickets, getStatusBadge, getPriorityBadge, getStatusIcon, loading, activeTab, editingTicket, setEditingTicket, updateTicket }) => {
  if (loading) {
    return <div className="text-center py-12 flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Chargement des tickets...</div>;
  }

  if (tickets.length === 0) {
    return (
      <Card className="glass-effect">
        <CardContent className="text-center py-12">
          <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun ticket</h3>
          <p className="text-muted-foreground mb-6">Vous n'avez pas encore de tickets dans cette catégorie.</p>
          {activeTab === 'en-cours' && (
            <Link to="/nouveau-ticket">
              <Button className="notion-gradient text-white hover:opacity-90">
                Créer votre premier ticket
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleStatusChange = (ticketId, newStatus) => {
    updateTicket(ticketId, { status: newStatus });
  };

  const handlePriorityChange = (ticketId, newPriority) => {
    updateTicket(ticketId, { priority: newPriority });
  };

  return (
    <Card className="glass-effect">
      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-[80px_1fr_120px_120px_120px_60px] items-center px-4 py-3 border-b bg-muted/30 font-medium text-sm">
          <div>Réf.</div>
          <div>Titre</div>
          <div>Priorité</div>
          <div>Statut</div>
          <div>Date création</div>
          <div></div>
        </div>
        
        <div className="divide-y divide-border">
          {tickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="grid grid-cols-[80px_1fr_120px_120px_120px_60px] items-center px-4 py-4 hover:bg-secondary/50 transition-colors gap-4"
            >
              {/* Référence */}
              <div className="text-sm font-mono text-muted-foreground">
                #{ticket.id.toString().padStart(4, '0')}
              </div>
              
              {/* Titre */}
              <div className="flex items-center space-x-3 overflow-hidden">
                {getStatusIcon(ticket.status)}
                <p className="font-semibold truncate" title={ticket.title}>{ticket.title}</p>
              </div>
              
              {/* Priorité - Directement modifiable */}
              <div>
                <Select 
                  value={ticket.priority || 'Moyen'} 
                  onValueChange={(value) => handlePriorityChange(ticket.id, value)}
                >
                  <SelectTrigger className="h-8 text-xs border-none bg-transparent hover:bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Faible">Faible</SelectItem>
                    <SelectItem value="Moyen">Moyen</SelectItem>
                    <SelectItem value="Élevé">Élevé</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Statut - Directement modifiable */}
              <div>
                <Select 
                  value={ticket.status} 
                  onValueChange={(value) => handleStatusChange(ticket.id, value)}
                >
                  <SelectTrigger className="h-8 text-xs border-none bg-transparent hover:bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A traiter">À traiter</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Répondu">Répondu</SelectItem>
                    <SelectItem value="Résolu">Résolu</SelectItem>
                    <SelectItem value="Abandonné">Abandonné</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date */}
              <div className="text-sm text-muted-foreground">
                {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
              </div>
              
              {/* Voir détail */}
              <div>
                <Link to={`/ticket/${ticket.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                  >
                    Voir
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};


export default TicketsPage;