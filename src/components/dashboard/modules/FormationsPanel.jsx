import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, X, GraduationCap, Copy, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import UserFormationStatusSelect from './UserFormationStatusSelect';
import ModuleHeader from '@/components/dashboard/ModuleHeader';
import { fetchUserParcoursList } from '@/lib/builder/parcoursApi';

const FormationsPanel = () => {
  const { user } = useAuth();
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const navigate = useNavigate();

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

  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    setLoadingDrafts(true);
    try {
      const data = await fetchUserParcoursList(user.id);
      setDrafts(data || []);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos brouillons.',
        variant: 'destructive',
      });
    } finally {
      setLoadingDrafts(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchFormations();
    fetchDrafts();
  }, [fetchFormations, fetchDrafts]);

  const handleStatusChange = (formationId, newStatus) => {
    setFormations(prev =>
      prev.map(f => (f.id === formationId ? { ...f, status: newStatus } : f))
    );
  };

  const handleEditFormation = async (item) => {
    try {
      // Charger le cours pour déterminer s'il est custom et à vous
      const { data: course, error: fetchErr } = await supabase
        .from('courses')
        .select('id, title, nodes, edges, author_id, course_type')
        .eq('id', item.id)
        .single();
      if (fetchErr) throw fetchErr;

      if (course.course_type === 'custom' && course.author_id === user.id) {
        navigate(`/formation-builder/${course.id}`);
        return;
      }

      // Sinon, on duplique en custom pour permettre l'édition
      const newTitle = `Copie de ${course.title}`;
      const { data: inserted, error: insertErr } = await supabase
        .from('courses')
        .insert({
          title: newTitle,
          author_id: user.id,
          status: 'draft',
          course_type: 'custom',
          nodes: course?.nodes || [],
          edges: course?.edges || [],
        })
        .select('id, title, status, updated_at')
        .single();
      if (insertErr) throw insertErr;

      setDrafts(prev => [inserted, ...prev]);
      navigate(`/formation-builder/${inserted.id}`);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible d\'ouvrir en édition.', variant: 'destructive' });
    }
  };

  const handleDuplicateFormation = async (item) => {
    try {
      // Charger le cours source (standard ou custom)
      const { data: course, error: fetchErr } = await supabase
        .from('courses')
        .select('id, title, nodes, edges')
        .eq('id', item.id)
        .single();
      if (fetchErr) throw fetchErr;

      const newTitle = `Copie de ${course.title}`;
      const { data: inserted, error: insertErr } = await supabase
        .from('courses')
        .insert({
          title: newTitle,
          author_id: user.id,
          status: 'draft',
          course_type: 'custom',
          nodes: course?.nodes || [],
          edges: course?.edges || [],
        })
        .select('id, title, status, updated_at')
        .single();
      if (insertErr) throw insertErr;

      setDrafts(prev => [inserted, ...prev]);
      toast({ title: 'Dupliquée', description: 'Une copie de la formation a été créée.' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Duplication impossible.', variant: 'destructive' });
    }
  };

  const handleStopFormation = async (formationId) => {
    try {
      const { error } = await supabase
        .from('user_formations')
        .update({ status: 'archive' })
        .eq('formation_id', formationId)
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

  const handleDeleteFormation = async (item) => {
    try {
      const { data, error } = await supabase.rpc('delete_user_course_cascade', { p_course_id: item.id });
      if (error) throw error;
      // Nettoyer les listes locales (enrolled et drafts)
      setFormations(prev => prev.filter(f => f.id !== item.id));
      setDrafts(prev => prev.filter(d => d.id !== item.id));
      toast({ title: 'Supprimée', description: 'La formation a été supprimée définitivement.' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer la formation.', variant: 'destructive' });
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

  const formatUpdatedDate = (draft) => {
    return draft?.updated_at ? new Date(draft.updated_at).toLocaleDateString('fr-FR') : 'N/A';
  };

  const getStatusLabel = (item) => {
    // Pour les clients, on affiche 'En préparation' à la place de 'draft/preparation'
    const s = (item?.status || '').toLowerCase();
    if (item.__origin !== 'enrollment') {
      if (s === 'draft' || s === 'preparation') return 'En préparation';
      return item.status || 'En préparation';
    }
    return item.status || '';
  };

  const normalizeStatus = (s) => (s || '').toString().trim().replace(/\s+/g, '_').toLowerCase();
  const canEdit = (item) => {
    if (item.__origin === 'draft') return true;
    // Si le statut manque côté enrollment, considérer par défaut 'en_preparation'
    const fallback = item.__origin === 'enrollment' && !item.status ? 'en_preparation' : item.status;
    const ns = normalizeStatus(fallback);
    return ns === 'en_preparation' || ns === 'preparation' || ns === 'draft';
  };

  // Unifier formations inscrites (enrolled) et brouillons (drafts)
  const mergedFormations = useMemo(() => {
    const byId = new Set(formations.map(f => f.id));
    const merged = [
      ...formations.map(f => ({ ...f, __origin: 'enrollment' })),
      ...drafts.filter(d => !byId.has(d.id)).map(d => ({ ...d, __origin: 'draft' })),
    ];
    // Trier par activité la plus récente (enrolled_at sinon updated_at)
    return merged.sort((a, b) => {
      const da = a.__origin === 'enrollment' ? (a.enrolled_at || a.updated_at) : a.updated_at;
      const db = b.__origin === 'enrollment' ? (b.enrolled_at || b.updated_at) : b.updated_at;
      const ta = da ? new Date(da).getTime() : 0;
      const tb = db ? new Date(db).getTime() : 0;
      return tb - ta;
    });
  }, [formations, drafts]);

  const isLoading = loading || loadingDrafts;

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
          <div className="flex items-center gap-3" />
          <div className="flex gap-2">
            <Link to="/formation-builder">
              <Button size="sm" className="h-6 px-2 text-[0.65rem]">
                <PlusCircle className="mr-1.5 h-3 w-3" />
                Créer un parcours personnalisé
              </Button>
            </Link>
            <Link to="/formations">
              <Button variant="outline" size="sm" className="h-6 px-2 text-[0.65rem]">
                Choisir une formation
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mergedFormations.length > 0 ? (
                mergedFormations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-normal">{item.title}</TableCell>
                    <TableCell>
                      {item.__origin === 'enrollment' ? (
                        <UserFormationStatusSelect formation={item} onStatusChange={handleStatusChange} />
                      ) : (
                        <Badge variant="secondary">{getStatusLabel(item)}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.__origin === 'enrollment' ? formatGoLiveDate(item) : formatUpdatedDate(item)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Dupliquer: disponible pour tous (enrolled ou draft) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Dupliquer"
                          onClick={() => handleDuplicateFormation(item)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        {/* Éditer: brouillons OU statut en préparation (normalisé) */}
                        {canEdit(item) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Éditer"
                            onClick={() => handleEditFormation(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer la formation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Attention, vous allez arrêter cette formation et la supprimer définitivement, est-ce que vous voulez?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteFormation(item)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="4" className="h-24 text-center">
                    Aucune formation trouvée.
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

