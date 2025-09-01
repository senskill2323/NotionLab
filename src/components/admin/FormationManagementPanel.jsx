import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Filter, PlusCircle, List, LayoutGrid } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import FormationListView from './formation-management/FormationListView';
import FormationGalleryView from './formation-management/FormationGalleryView';

const FormationManagementPanel = () => {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('gallery');
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchFormations = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('courses')
      .select(`
        id,
        title,
        status,
        course_type,
        created_at,
        cover_image_url,
        nodes,
        edges,
        author_id,
        author:profiles (id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les formations.',
        variant: 'destructive',
      });
    } else {
      setFormations(data);
    }
    setLoading(false);
  }, [toast, statusFilter, searchTerm]);

  useEffect(() => {
    fetchFormations();
  }, [fetchFormations]);

  const handleStatusChange = useCallback((formationId, newStatus) => {
    setFormations(prev =>
      prev.map(f => (f.id === formationId ? { ...f, status: newStatus } : f))
    );
  }, []);
  
  const handleTypeChange = useCallback((formationId, newType) => {
    setFormations(prev =>
      prev.map(f => (f.id === formationId ? { ...f, course_type: newType } : f))
    );
  }, []);

  const handleDuplicate = useCallback(async (formation) => {
    const newTitle = `Copie de ${formation.title}`;
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: newTitle,
        description: formation.description,
        status: 'draft',
        course_type: formation.course_type,
        author_id: formation.author_id,
        nodes: formation.nodes,
        edges: formation.edges,
        objectives: formation.objectives,
        program: formation.program,
      })
      .select('id')
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de dupliquer le parcours.", variant: "destructive" });
    } else {
      toast({ title: "Dupliqué !", description: `Le parcours a été dupliqué.` });
      await fetchFormations();
      navigate(`/formation-builder/${data.id}`);
    }
  }, [toast, fetchFormations, navigate]);

  const handleDelete = useCallback(async (formationId) => {
    const { error } = await supabase.from('courses').delete().eq('id', formationId);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le parcours.", variant: "destructive" });
    } else {
      toast({ title: "Supprimé", description: "Le parcours a été supprimé." });
      setFormations(prev => prev.filter(f => f.id !== formationId));
    }
  }, [toast]);

  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Gestion des Formations
            </CardTitle>
            <CardDescription>
              Validez, publiez et gérez toutes les formations de la plateforme.
            </CardDescription>
          </div>
          <Link to="/formation-builder">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Créer une formation
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Input
            placeholder="Rechercher par titre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm flex-grow"
          />
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="a_valider">À valider</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value)} className="ml-auto">
            <ToggleGroupItem value="gallery" aria-label="Vue galerie">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Vue liste">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === 'list' ? (
                <FormationListView 
                  formations={formations} 
                  onStatusChange={handleStatusChange} 
                  onTypeChange={handleTypeChange}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ) : (
                <FormationGalleryView 
                  formations={formations} 
                  onStatusChange={handleStatusChange}
                  onTypeChange={handleTypeChange}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
};

export default FormationManagementPanel;