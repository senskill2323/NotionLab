import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import UserFormationStatusSelect from './UserFormationStatusSelect';

const FormationsPanel = () => {
  const { user } = useAuth();
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const badgeVariant = (type) => {
    switch(type) {
        case 'standard': return 'default';
        case 'custom': return 'secondary';
        default: return 'outline';
    }
  };

  return (
    <Card className="glass-effect">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Mes Formations</CardTitle>
          <CardDescription>Consultez et gérez vos formations et parcours personnalisés.</CardDescription>
        </div>
        <Link to="/formation-builder">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un parcours
          </Button>
        </Link>
      </CardHeader>
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
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formations.length > 0 ? (
                formations.map((formation) => (
                  <TableRow key={formation.id}>
                    <TableCell className="font-medium">{formation.title}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(formation.course_type)}>
                        {formation.course_type === 'standard' ? 'Standard' : 'Personnalisé'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UserFormationStatusSelect formation={formation} onStatusChange={handleStatusChange} />
                    </TableCell>
                    <TableCell>
                      {formation.enrolled_at ? new Date(formation.enrolled_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formation.course_type === 'custom' ? (
                        <Link to={formation.status === 'demarre' ? `/parcours/${formation.id}` : `/formation-builder/${formation.id}`}>
                          <Button variant="outline" size="sm">
                            {formation.status === 'demarre' ? 'Commencer' : 'Modifier'}
                          </Button>
                        </Link>
                      ) : (
                        <Link to={`/formation/${formation.id}`}>
                          <Button variant="outline" size="sm">
                            Voir
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="5" className="h-24 text-center">
                    Vous n'êtes inscrit à aucune formation pour le moment.
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