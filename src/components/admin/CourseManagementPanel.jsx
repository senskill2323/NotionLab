import React, { useState, useEffect, useMemo, useCallback } from 'react';
    import { supabase } from '@/lib/customSupabaseClient';
    import {
      Card,
      CardHeader,
      CardTitle,
      CardContent,
      CardDescription,
    } from '@/components/ui/card';
    import {
      Table,
      TableBody,
      TableCell,
      TableHead,
      TableHeader,
      TableRow,
    } from '@/components/ui/table';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
    } from '@/components/ui/select';
    import { Badge } from '@/components/ui/badge';
    import { useToast } from '@/components/ui/use-toast';
    import { motion } from 'framer-motion';
    import { Loader2, Search, Pencil, Trash2, X } from 'lucide-react';
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
    import { useDebounce } from 'use-debounce';

    const CourseStatusSelect = ({ course, onStatusChange }) => {
      const [isUpdating, setIsUpdating] = useState(false);
      const { toast } = useToast();

      const handleStatusChange = async (newStatus) => {
        setIsUpdating(true);
        const { error } = await supabase
          .from('courses')
          .update({ status: newStatus })
          .eq('id', course.id);

        if (error) {
          toast({
            title: 'Erreur',
            description: `Impossible de mettre à jour le statut: ${error.message}`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Succès',
            description: 'Statut mis à jour.',
          });
          onStatusChange(course.id, newStatus);
        }
        setIsUpdating(false);
      };

      return (
        <div className="flex items-center gap-2">
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
          <Select
            value={course.status}
            onValueChange={handleStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="a_valider">À valider</SelectItem>
              <SelectItem value="preparation">En préparation</SelectItem>
              <SelectItem value="archived">Archivée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    };
    
    const CourseManagementPanel = () => {
      const [courses, setCourses] = useState([]);
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState('');
      const [filters, setFilters] = useState({ type: 'all', status: 'all' });
      const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
      const { toast } = useToast();

      const fetchCourses = useCallback(async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('courses')
            .select('*, author:profiles(first_name, last_name)')
            .order('created_at', { ascending: false });

          if (error) throw error;
          
          setCourses(data.map(c => ({...c, author_name: c.author ? `${c.author.first_name} ${c.author.last_name}` : 'Système' })));

        } catch (err) {
          toast({
            title: 'Erreur',
            description: 'Impossible de charger les formations.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      }, [toast]);
      
      useEffect(() => {
        fetchCourses();
      }, [fetchCourses]);

      const filteredCourses = useMemo(() => {
        return courses.filter(course => {
          const matchesSearch = debouncedSearchTerm
            ? course.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            : true;
          const matchesType = filters.type === 'all' || course.course_type === filters.type;
          const matchesStatus = filters.status === 'all' || course.status === filters.status;
          return matchesSearch && matchesType && matchesStatus;
        });
      }, [courses, debouncedSearchTerm, filters]);

      const handleStatusChange = (courseId, newStatus) => {
        setCourses(prevCourses =>
          prevCourses.map(course =>
            course.id === courseId ? { ...course, status: newStatus } : course
          )
        );
      };
      
      const handleDelete = async (courseId) => {
        const { error } = await supabase.from('courses').delete().eq('id', courseId);
        if (error) {
          toast({ title: 'Erreur', description: `Impossible de supprimer: ${error.message}`, variant: 'destructive' });
        } else {
          setCourses(prev => prev.filter(c => c.id !== courseId));
          toast({ title: 'Succès', description: 'Formation supprimée.' });
        }
      };

      const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
      };
      
      const badgeVariant = (type) => {
        switch(type) {
            case 'standard': return 'default';
            case 'custom': return 'secondary';
            default: return 'outline';
        }
      };

      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Gestion Avancée des Formations</CardTitle>
              <CardDescription>
                Gérez toutes les formations, standards et personnalisées.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative w-full sm:w-1/2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par titre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setSearchTerm('')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrer par type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="a_valider">À valider</SelectItem>
                    <SelectItem value="preparation">En préparation</SelectItem>
                    <SelectItem value="archived">Archivée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Auteur</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.title}</TableCell>
                          <TableCell>
                            <Badge variant={badgeVariant(course.course_type)}>{course.course_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <CourseStatusSelect course={course} onStatusChange={handleStatusChange} />
                          </TableCell>
                          <TableCell>{course.author_name}</TableCell>
                          <TableCell>{new Date(course.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => toast({ title: "🚧 Fonctionnalité à venir !", description: "La modification sera bientôt disponible." })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. La formation "{course.title}" sera définitivement supprimée.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(course.id)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Aucun résultat.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      );
    };

    export default CourseManagementPanel;