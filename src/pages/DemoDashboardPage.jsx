import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Ticket, Plus, ArrowRight, ExternalLink, Info, CheckCircle, Clock, PackageX, AlertCircle, ShieldAlert, GitBranch, Star, Download, Trash2, FileType, Youtube, FileText, User, LogOut } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { mockUser, mockFormations, mockTickets, mockResources, mockUserParcours } from '@/data/mockData.js';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DemoDashboardPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTicketTab, setActiveTicketTab] = React.useState('en-cours');

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
    
    const allUserFormations = [
        ...mockFormations.map(f => ({ ...f, type: 'standard' })),
        ...mockUserParcours.map(p => ({ id: p.id, title: p.name, type: 'custom', created_at: p.created_at }))
    ].sort((a, b) => new Date(b.created_at || b.enrolled_at) - new Date(a.created_at || a.enrolled_at));

    const ticketCounts = React.useMemo(() => ({
      'en-cours': mockTickets.filter(t => ['A traiter', 'En cours', 'Répondu'].includes(t.status)).length,
      'archives': mockTickets.filter(t => ['Résolu', 'Abandonné'].includes(t.status)).length
    }), []);
    
    const filteredTickets = React.useMemo(() => {
        const openStatuses = ['A traiter', 'En cours', 'Répondu'];
        const closedStatuses = ['Résolu', 'Abandonné'];
        const sortedTickets = [...mockTickets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (activeTicketTab === 'en-cours') {
            return sortedTickets.filter(ticket => openStatuses.includes(ticket.status));
        } else {
            return sortedTickets.filter(ticket => closedStatuses.includes(ticket.status));
        }
    }, [activeTicketTab]);

    const getPriorityBadge = (priority) => {
        const styles = {
          'Bas': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
          'Moyen': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
          'Haut': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
          'Urgent': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 font-bold',
        };
        return <Badge variant="outline" className={`cursor-pointer font-medium py-1 px-2 text-xs border-none ${styles[priority] || styles['Moyen']}`}><ShieldAlert className="w-3 h-3 mr-1.5" />{priority}</Badge>;
    };
    
    const getTicketStatusBadge = (status) => {
        let icon, className, text;
        switch(status) {
            case 'A traiter': text = 'À traiter'; className = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'; icon = <Clock className="w-3 h-3 mr-1.5" />; break;
            case 'En cours': case 'Répondu': text = 'En cours'; className = 'bg-orange-200 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200'; icon = <Clock className="w-3 h-3 mr-1.5" />; break;
            case 'Résolu': text = 'Résolu'; className = 'bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200'; icon = <CheckCircle className="w-3 h-3 mr-1.5" />; break;
            case 'Abandonné': text = 'Abandonné'; className = 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200'; icon = <PackageX className="w-3 h-3 mr-1.5" />; break;
            default: text = status; className = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'; icon = <AlertCircle className="w-3 h-3 mr-1.5" />;
        }
        return <Badge variant="outline" className={`cursor-pointer font-medium py-1 px-2 text-xs border-none ${className}`}>{icon}{text}</Badge>;
    };

    const getFileIcon = (format) => {
        switch (format) {
            case 'pdf': return <FileType className="w-5 h-5 text-red-500" />;
            case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />;
            case 'internal_note': return <FileText className="w-5 h-5 text-yellow-500" />;
            default: return <FileText className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <>
        <Helmet>
            <title>Démo du Tableau de Bord | NotionLab</title>
            <meta name="description" content="Découvrez une démo interactive du tableau de bord client." />
        </Helmet>
        <div className="min-h-screen bg-background">
            <div className="pt-24 container mx-auto px-4">
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md mb-8 flex items-start justify-between gap-4 shadow-sm flex-wrap">
                    <div className="flex items-start gap-3">
                        <Info className="w-6 h-6 flex-shrink-0 mt-0.5 text-blue-600"/>
                        <div>
                            <p className="font-bold">Vous consultez la version démo.</p>
                            <p className="text-sm">Ceci est un aperçu interactif. Pour accéder à votre propre espace, créez un compte ou connectez-vous.</p>
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => navigate('/')}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Quitter le mode démo
                    </Button>
                </div>
            </div>
            
            <div className="pt-8 pb-16">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-8 flex justify-between items-start flex-wrap gap-4">
                 <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Bonjour <span className="gradient-text">{mockUser.profile.first_name}</span> !
                    </h1>
                    <p className="text-base text-foreground/80">Bienvenue sur votre espace de formation! Si vous avez une question, n'hésitez pas à me contacter.</p>
                 </div>
              </motion.div>
              
              <div className="flex flex-col gap-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="glass-effect">
                        <CardHeader className="p-4 flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center text-base"><BookOpen className="w-4 h-4 mr-2 text-primary" />Mes Formations</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="space-y-2">
                            {allUserFormations.length > 0 ? allUserFormations.map((formation) => (
                                <div key={`${formation.type}-${formation.id}`} className="bg-secondary/50 rounded-md p-3 flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-sm">{formation.title}</h4>
                                    {formation.type === 'standard' ? (
                                    <p className="text-xs text-muted-foreground">{formation.level?.join(', ')}</p>
                                    ) : (
                                    <Badge variant="outline" className="mt-1 text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300">
                                        <GitBranch className="w-3 h-3 mr-1.5" />
                                        Formation personnalisée
                                    </Badge>
                                    )}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleDisabledFeature('accéder à la formation')}>Voir <ArrowRight className="w-3 h-3 ml-1.5" /></Button>
                                </div>
                            )) : (
                                <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground mb-3">Aucune formation.</p>
                                <Link to="/formations"><Button variant="outline" size="sm">Découvrir</Button></Link>
                                </div>
                            )}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="glass-effect">
                        <CardHeader className="p-4">
                            <CardTitle className="flex items-center text-base"><User className="w-4 h-4 mr-2 text-primary" />Mes Informations</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="email" className="text-xs">E-mail</Label>
                                    <Input id="email" type="email" defaultValue={mockUser.profile.email} disabled className="bg-muted h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="phone_number" className="text-xs">N° de téléphone</Label>
                                    <Input id="phone_number" defaultValue={mockUser.profile.phone_number} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="postal_code" className="text-xs">Code postal</Label>
                                    <Input id="postal_code" defaultValue={mockUser.profile.postal_code} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="city" className="text-xs">Ville</Label>
                                    <Input id="city" defaultValue={mockUser.profile.city} className="h-8 text-xs" />
                                </div>
                                <Button type="button" className="w-full notion-gradient text-white h-9 mt-2" onClick={() => handleDisabledFeature("enregistrer vos informations")}>Enregistrer</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <Card className="glass-effect w-full col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center text-base font-semibold"><Star className="w-4 h-4 mr-2 text-primary" />Vos ressources assignées</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {mockResources.map((res) => (
                            <div key={res.id} className="bg-secondary/50 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1">
                                    {getFileIcon(res.format)}
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{res.name}</p>
                                        <p className="text-xs text-muted-foreground">{res.type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 cursor-pointer transition-colors ${i < res.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} onClick={() => handleDisabledFeature('noter une ressource')} />)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDisabledFeature('télécharger une ressource')}><Download className="w-4 h-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle><AlertDialogDescription>Cette action retirera la ressource de votre tableau de bord.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleDisabledFeature('supprimer une ressource')} className="bg-destructive hover:bg-destructive/90">Retirer</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-effect w-full">
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <CardTitle className="flex items-center"><Ticket className="w-5 h-5 mr-2 text-primary" />Mes Tickets</CardTitle>
                      <div className="flex items-center gap-4">
                        <Tabs value={activeTicketTab} onValueChange={setActiveTicketTab} className="w-full max-w-xs">
                          <TabsList className="grid w-full grid-cols-2 bg-secondary">
                            <TabsTrigger value="en-cours">En cours ({ticketCounts['en-cours']})</TabsTrigger>
                            <TabsTrigger value="archives">Archivés ({ticketCounts['archives']})</TabsTrigger>
                          </TabsList>
                        </Tabs>
                        <Button size="lg" className="notion-gradient text-white hover:opacity-90 flex items-center justify-center gap-2" onClick={() => navigate('/nouveau-ticket')}><Plus className="w-5 h-5" /><span>Nouveau ticket</span></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredTickets.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead className="w-[110px] text-center">Date</TableHead><TableHead className="w-[90px] text-center">Heure</TableHead><TableHead className="w-[120px] text-center">Priorité</TableHead><TableHead className="w-[130px] text-center">Statut</TableHead><TableHead className="w-[100px] text-right">Action</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {filteredTickets.map((ticket) => (
                              <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleDisabledFeature('ouvrir un ticket')}>
                                <TableCell className="font-medium py-3">{ticket.title}</TableCell>
                                <TableCell className="text-center text-muted-foreground py-3">{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell className="text-center text-muted-foreground py-3">{new Date(ticket.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                <TableCell className="text-center py-3" onClick={(e) => e.stopPropagation()}>
                                  <Select defaultValue={ticket.priority} onValueChange={() => handleDisabledFeature('changer la priorité')}>
                                      <SelectTrigger hideArrow={true} className="h-auto w-auto p-0 border-none focus:ring-0 focus:ring-offset-0"><SelectValue asChild>{getPriorityBadge(ticket.priority)}</SelectValue></SelectTrigger>
                                      <SelectContent><SelectItem value="Bas">Bas</SelectItem><SelectItem value="Moyen">Moyen</SelectItem><SelectItem value="Haut">Haut</SelectItem><SelectItem value="Urgent">Urgent</SelectItem></SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-center py-3" onClick={(e) => e.stopPropagation()}>
                                  <Select defaultValue={ticket.status} onValueChange={() => handleDisabledFeature('changer le statut')}>
                                    <SelectTrigger hideArrow={true} className="h-auto w-auto p-0 border-none focus:ring-0 focus:ring-offset-0"><SelectValue asChild>{getTicketStatusBadge(ticket.status)}</SelectValue></SelectTrigger>
                                    <SelectContent><SelectItem value="A traiter">À traiter</SelectItem><SelectItem value="En cours">En cours</SelectItem><SelectItem value="Résolu">Résolu</SelectItem><SelectItem value="Abandonné">Abandonné</SelectItem></SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right py-3"><Button variant="outline" size="sm" >Ouvrir <ExternalLink className="w-3 h-3 ml-2" /></Button></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">{activeTicketTab === 'en-cours' ? "Vous n'avez aucun ticket en cours." : "Vous n'avez aucun ticket archivé."}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
        </div>
        </>
    );
};

export default DemoDashboardPage;