import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Loader2, Eye, Trash2, Package, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const BuilderManagementPanel = ({ onDataChange }) => {
  const [parcours, setParcours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchParcours = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          nodes,
          created_at,
          author:profiles( id, email, first_name, last_name )
        `)
        .eq('course_type', 'custom')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = data.map(p => ({
        ...p,
        user: p.author
      }));

      setParcours(formattedData || []);
      
      if (onDataChange) {
        onDataChange(formattedData || []);
      }
    } catch (err) {
      setError(err.message);
      toast({ title: "Erreur", description: "Impossible de charger les parcours.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, onDataChange]);

  useEffect(() => {
    setLoading(true);
    fetchParcours();
    
    const channel = supabase
      .channel('public:courses:custom')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses', filter: 'course_type=eq.custom' }, (payload) => {
        fetchParcours();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchParcours]);
  
  const handleViewParcours = (parcoursId) => {
    navigate(`/parcours/${parcoursId}`);
  };

  const handleDeleteParcours = async (parcoursId) => {
    const { error } = await supabase.from('courses').delete().eq('id', parcoursId);
    if (error) {
      toast({ title: "Erreur", description: "Le parcours n'a pas pu être supprimé.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Le parcours a été supprimé." });
    }
  };

  const calculateParcoursStats = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return { moduleCount: 0, totalHours: '0.0' };
    const courseNodes = nodes.filter(n => n.id !== 'start');
    const count = courseNodes.length;
    const totalMinutes = courseNodes.reduce((sum, node) => sum + (node?.data?.duration * 45 || 0), 0);
    const hours = (totalMinutes / 60).toFixed(1);
    return { moduleCount: count, totalHours: hours };
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (error) {
    return <p className="text-destructive">Erreur : {error}</p>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Formations Personnalisées</CardTitle>
          <CardDescription>Liste de tous les parcours de formation créés par les utilisateurs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du Parcours</TableHead>
                <TableHead className="w-[220px]">Créé par</TableHead>
                <TableHead className="w-[120px]">Modules</TableHead>
                <TableHead className="w-[120px]">Durée</TableHead>
                <TableHead className="w-[120px]">Créé le</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcours.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun parcours créé pour le moment.</TableCell>
                </TableRow>
              ) : (
                parcours.map((p) => {
                  const { moduleCount, totalHours } = calculateParcoursStats(p.nodes);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.user?.email || 'Utilisateur inconnu'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="w-4 h-4" />
                          <span>{moduleCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Timer className="w-4 h-4" />
                          <span>{totalHours} h</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleViewParcours(p.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Cela supprimera définitivement le parcours "{p.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteParcours(p.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BuilderManagementPanel;