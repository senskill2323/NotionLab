import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Ticket, Plus, ExternalLink } from 'lucide-react';

const DemoTicketsPanel = ({ tickets }) => {
  const { toast } = useToast();
  const [activeTicketTab, setActiveTicketTab] = React.useState('en-cours');
  
  const filteredTickets = React.useMemo(() => {
    if (activeTicketTab === 'en-cours') {
        return tickets.filter(ticket => ticket.status === 'Ouvert' || ticket.status === 'Répondu');
    }
    return tickets.filter(ticket => ticket.status === 'Fermé' || ticket.status === 'Résolu');
  }, [tickets, activeTicketTab]);

  const handleDisabledFeature = (feature) => {
    toast({
      title: 'Ceci est une démo',
      description: `Pour ${feature}, veuillez vous connecter ou créer un compte.`,
      action: (
        <div className="flex gap-2">
            <Link to="/connexion"><Button variant="outline" size="sm">Connexion</Button></Link>
            <Link to="/inscription"><Button size="sm">Inscription</Button></Link>
        </div>
      )
    });
  };
  
  const ticketCounts = React.useMemo(() => ({
    'en-cours': tickets.filter(t => t.status === 'Ouvert' || t.status === 'Répondu').length,
    'resolus': tickets.filter(t => t.status === 'Fermé' || t.status === 'Résolu').length
  }), [tickets]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
      <Card className="glass-effect">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center"><Ticket className="w-5 h-5 mr-2 text-primary" />Mes Tickets</CardTitle>
            <Button size="sm" className="notion-gradient text-white hover:opacity-90" onClick={() => handleDisabledFeature('créer un ticket')}>
              <Plus className="w-4 h-4 mr-2" />Nouveau ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTicketTab} onValueChange={setActiveTicketTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="en-cours">En cours ({ticketCounts['en-cours']})</TabsTrigger>
              <TabsTrigger value="resolus">Résolus ({ticketCounts['resolus']})</TabsTrigger>
            </TabsList>
            <TabsContent value="en-cours" className="mt-4">
               <TicketTable tickets={filteredTickets} onAction={handleDisabledFeature} />
            </TabsContent>
            <TabsContent value="resolus" className="mt-4">
               <TicketTable tickets={filteredTickets} onAction={handleDisabledFeature} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const TicketTable = ({ tickets, onAction }) => {
  if (tickets.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Aucun ticket à afficher dans cette catégorie.</p>;
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent': return 'destructive';
      case 'Haut': return 'destructive';
      case 'Moyen': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead className="w-[120px]">Priorité</TableHead>
            <TableHead className="w-[180px]">Date</TableHead>
            <TableHead className="w-[120px]">Statut</TableHead>
            <TableHead className="w-[100px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-medium py-2">{ticket.title}</TableCell>
              <TableCell className="py-2">
                <Badge variant={getPriorityBadge(ticket.priority)}>{ticket.priority}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground py-2 text-sm">{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</TableCell>
              <TableCell className="py-2">
                <Select defaultValue={ticket.status} onValueChange={() => onAction('changer le statut')}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Ouvert">Ouvert</SelectItem>
                        <SelectItem value="Répondu">Répondu</SelectItem>
                        <SelectItem value="Fermé">Fermé</SelectItem>
                        <SelectItem value="Résolu">Résolu</SelectItem>
                    </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right py-2">
                <Button variant="outline" size="sm" onClick={() => onAction('ouvrir un ticket')}>
                  Ouvrir <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DemoTicketsPanel;