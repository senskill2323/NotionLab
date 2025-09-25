import React, { useState, useEffect, useCallback } from 'react';
    import { Helmet } from 'react-helmet';
    import { motion } from 'framer-motion';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';
    import { Switch } from '@/components/ui/switch';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Loader2, Puzzle, CheckCircle, XCircle, Plus, Eye } from 'lucide-react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Button } from '@/components/ui/button';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

    import FormationsPanel from '@/components/dashboard/modules/FormationsPanel';
    import TicketsPanel from '@/components/dashboard/modules/TicketsPanel';
    import ResourcesPanel from '@/components/dashboard/modules/ResourcesPanel';
    import PersonalDataPanel from '@/components/dashboard/modules/PersonalDataPanel';
    import BuilderPanel from '@/components/dashboard/modules/BuilderPanel';
    import KanbanPanel from '@/components/kanban/KanbanPanel';
    import TrainingPreferencesPanel from '@/components/dashboard/modules/TrainingPreferencesPanel';
    import AssistantPanel from '@/components/dashboard/modules/AssistantPanel';

    const componentMap = {
      client_formations: FormationsPanel,
      client_tickets: TicketsPanel,
      client_resources: ResourcesPanel,
      client_personal_data: PersonalDataPanel,
      client_builder: BuilderPanel,
      client_kanban_formations: KanbanPanel,
      client_training_preferences: TrainingPreferencesPanel,
      client_ai_assistant: AssistantPanel,
    };

    const PreviewDialog = ({ module, open, onOpenChange }) => {
      if (!module) return null;

      const PreviewComponent = componentMap[module.module_key];

      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Aperçu du module : {module.name}</DialogTitle>
              <DialogDescription>
                Voici à quoi ressemblera ce module sur le tableau de bord de l'utilisateur.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 p-4 bg-muted/30 rounded-lg">
              {PreviewComponent ? <PreviewComponent editMode={true} /> : <p>Aperçu non disponible pour ce module.</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };

    const ModuleManagerPage = () => {
      const [modules, setModules] = useState([]);
      const [loading, setLoading] = useState(true);
      const [previewingModule, setPreviewingModule] = useState(null);
      const { toast } = useToast();

      const fetchModules = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('modules_registry')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          toast({ title: 'Erreur', description: 'Impossible de charger les modules.', variant: 'destructive' });
          console.error(error);
        } else {
          setModules(data);
        }
        setLoading(false);
      }, [toast]);

      useEffect(() => {
        fetchModules();
      }, [fetchModules]);

      const handleToggleActive = async (moduleId, currentStatus) => {
        const newStatus = !currentStatus;
        const { error } = await supabase
          .from('modules_registry')
          .update({ is_active: newStatus })
          .eq('id', moduleId);

        if (error) {
          toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut du module.', variant: 'destructive' });
        } else {
          toast({ title: 'Succès', description: `Le module a été ${newStatus ? 'activé' : 'désactivé'}.` });
          setModules(prevModules =>
            prevModules.map(m => (m.id === moduleId ? { ...m, is_active: newStatus } : m))
          );
        }
      };

      const handleAddNewModule = () => {
        toast({
          title: 'Fonctionnalité à venir',
          description: "La création de nouveaux modules n'est pas encore implémentée.",
        });
      };

      if (loading) {
        return (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        );
      }

      return (
        <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Helmet>
              <title>Gestionnaire de Modules | Admin</title>
              <meta name="description" content="Gérez l'activation des modules de la plateforme." />
            </Helmet>
            <Card className="glass-effect">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Puzzle className="w-6 h-6 text-primary" />
                    Gestionnaire de Modules
                  </CardTitle>
                  <CardDescription>Activez ou désactivez les modules de la plateforme. Un module désactivé n'apparaîtra pour personne, quels que soient les droits.</CardDescription>
                </div>
                <Button onClick={handleAddNewModule} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un module
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[25%] font-bold">Nom du Module</TableHead>
                        <TableHead className="w-[40%] font-bold">Description</TableHead>
                        <TableHead className="w-[20%] font-bold">Permission Requise</TableHead>
                        <TableHead className="text-center font-bold">Statut</TableHead>
                        <TableHead className="text-center font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modules.length > 0 ? (
                        modules.map(module => (
                          <TableRow key={module.id}>
                            <TableCell className="font-medium">{module.name}</TableCell>
                            <TableCell>{module.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{module.required_permission}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                {module.is_active ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                )}
                                <Switch
                                  checked={module.is_active}
                                  onCheckedChange={() => handleToggleActive(module.id, module.is_active)}
                                  aria-label={`Activer/Désactiver le module ${module.name}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => setPreviewingModule(module)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            Aucun module trouvé. Cliquez sur "Ajouter un module" pour en créer un.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <PreviewDialog
            module={previewingModule}
            open={!!previewingModule}
            onOpenChange={(isOpen) => !isOpen && setPreviewingModule(null)}
          />
        </>
      );
    };

    export default ModuleManagerPage;