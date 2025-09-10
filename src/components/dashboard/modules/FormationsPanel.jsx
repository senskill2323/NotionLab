import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, X, GraduationCap } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import UserFormationStatusSelect from './UserFormationStatusSelect';
import ModuleHeader from '@/components/dashboard/ModuleHeader';

const FormationsPanel = () => {
  const { user } = useAuth();
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inProgress');
  const { toast } = useToast();

  const fetchFormations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_courses_and_parcours', { p_user_id: user.id });
      if (error) throw error;
      
      const formationsWithUserId = data.map(f => ({ ...f, user_id: user.id }));
      setFormations(formationsWithUserId);

    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos formations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchFormations();
  }, [fetchFormations]);

  const handleStatusChange = (formationId, newStatus) => {
    setFormations(prev =>
      prev.map(f => (f.id === formationId ? { ...f, status: newStatus } : f))
    );
  };

  const handleStopFormation = async (formationId) => {
    try {
      const { error } = await supabase
        .from('user_courses')
        .update({ status: 'arrete' })
        .eq('course_id', formationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFormations(prev =>
        prev.map(f => (f.id === formationId ? { ...f, status: 'arrete' } : f))
      );

      toast({
        title: 'Formation arrêtée',
        description: 'La formation a été arrêtée avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'arrêter la formation.',
        variant: 'destructive',
      });
    }
  };

  const formatGoLiveDate = (formation) => {
    // For now, use enrolled_at as placeholder for go-live date
    // TODO: Replace with actual admin go-live date from courses table
    if (formation.status === 'demarre' && formation.enrolled_at) {
      return new Date(formation.enrolled_at).toLocaleDateString('fr-FR');
    }
    return 'N/A';
  };

  // Filtrage des formations par statut
  const inProgressFormations = formations.filter(f => f.status === 'demarre' || f.status === 'en_cours');
  const archivedFormations = formations.filter(f => f.status === 'termine' || f.status === 'arrete');
  
  const displayFormations = activeTab === 'inProgress' ? inProgressFormations : archivedFormations;

  return (
    <Card className="glass-effect h-full">
      <CardHeader className="p-3 pb-2">
        <ModuleHeader
          title="Mes Formations"
          Icon={GraduationCap}
          variant="slate"
        />
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
          </div>
          <div className="flex gap-2">
            <Link to="/formation-builder">
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Créer un parcours personnalisé
              </Button>
            </Link>
            <Link to="/formations">
              <Button variant="outline" size="sm">
                Choisir une formation
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Démarré le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayFormations.length > 0 ? (
                displayFormations.map((formation) => (
                  <TableRow key={formation.id}>
                    <TableCell className="font-normal">{formation.title}</TableCell>
                    <TableCell>
                      <UserFormationStatusSelect formation={formation} onStatusChange={handleStatusChange} />
                    </TableCell>
                    <TableCell>
                      {formatGoLiveDate(formation)}
                    </TableCell>
                    <TableCell>
                      {formation.status === 'demarre' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Arrêter la formation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Attention, vous allez arrêter cette formation. Cette action peut être annulée en changeant le statut plus tard.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleStopFormation(formation.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Arrêter
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="4" className="h-24 text-center">
                    {activeTab === 'inProgress' 
                      ? "Aucune formation en cours pour le moment."
                      : "Aucune formation archivée pour le moment."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default FormationsPanel;