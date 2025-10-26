import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  MessageSquare,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';

const VIEW_PERMISSION = 'admin:testimonials:view_module';
const UPDATE_PERMISSION = 'admin:testimonials:update';
const DELETE_PERMISSION = 'admin:testimonials:delete';

const clampRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(Math.round(parsed), 1), 5);
};

const statusOptions = [
  { value: 'all', label: 'Tous les témoignages' },
  { value: 'published', label: 'Publié (public)' },
  { value: 'pending', label: 'En attente de publication' },
];

const ratingOptions = [5, 4, 3, 2, 1];

const INITIAL_FORM = {
  authorName: '',
  authorRole: '',
  content: '',
  rating: 5,
  isPublic: false,
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const TestimonialsManagementPanel = () => {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(INITIAL_FORM);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canEdit = hasPermission(UPDATE_PERMISSION);
  const canDelete = hasPermission(DELETE_PERMISSION);

  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('testimonials')
        .select(`
          id,
          created_at,
          updated_at,
          author_name,
          author_role,
          content,
          rating,
          is_public,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      const baseTestimonials = Array.isArray(data) ? data : [];

      const userIds = Array.from(
        new Set(
          baseTestimonials
            .map((item) => item.user_id)
            .filter((value) => value),
        ),
      );

      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, user_types ( type_name )')
          .in('id', userIds);

        if (profilesError) {
          console.warn('Failed to load testimonial profiles metadata:', profilesError);
        } else if (Array.isArray(profilesData)) {
          profilesMap = new Map(
            profilesData.map((profile) => [profile.id, profile]),
          );
        }
      }

      const enrichedTestimonials = baseTestimonials.map((item) => ({
        ...item,
        profile: profilesMap.get(item.user_id) || null,
      }));

      setTestimonials(enrichedTestimonials);
    } catch (err) {
      console.error('Failed to load testimonials:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: 'Impossible de charger les témoignages',
        description:
          err instanceof Error ? err.message : "Une erreur inattendue s'est produite.",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTestimonials();

    const channel = supabase
      .channel('admin:testimonials')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'testimonials' },
        fetchTestimonials,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTestimonials]);

  const filteredTestimonials = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return testimonials.filter((item) => {
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'published'
          ? item.is_public === true
          : item.is_public !== true;

      if (!matchesStatus) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        item.author_name,
        item.author_role,
        item.content,
        item?.profile?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [testimonials, searchQuery, statusFilter]);

  const openEditDialog = (testimonial) => {
    if (!testimonial) return;
    setEditingId(testimonial.id);
    setFormState({
      authorName: testimonial.author_name || '',
      authorRole: testimonial.author_role || '',
      content: testimonial.content || '',
      rating: clampRating(testimonial.rating ?? 5),
      isPublic: testimonial.is_public ?? false,
    });
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingId(null);
    setFormState(INITIAL_FORM);
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    if (!editingId || !canEdit) return;

    const payload = {
      author_name: formState.authorName.trim(),
      author_role: formState.authorRole.trim() || null,
      content: formState.content.trim(),
      rating: clampRating(formState.rating),
      is_public: !!formState.isPublic,
    };

    if (!payload.content) {
      toast({
        title: 'Contenu requis',
        description: 'Merci de préciser un témoignage avant de sauvegarder.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('testimonials')
        .update(payload)
        .eq('id', editingId);

      if (updateError) throw updateError;

      toast({
        title: 'Témoignage mis à jour',
        description: 'Les modifications ont été enregistrées avec succès.',
      });
      closeEditDialog();
      fetchTestimonials();
    } catch (err) {
      console.error('Failed to update testimonial:', err);
      toast({
        title: 'Échec de la mise à jour',
        description:
          err instanceof Error ? err.message : "Une erreur inattendue s'est produite.",
        variant: 'destructive',
      });
    }
  };

  const handleToggleVisibility = async (testimonial, nextValue) => {
    if (!canEdit || !testimonial) return;
    try {
      const { error: updateError } = await supabase
        .from('testimonials')
        .update({ is_public: nextValue })
        .eq('id', testimonial.id);

      if (updateError) throw updateError;
      setTestimonials((prev) =>
        prev.map((item) =>
          item.id === testimonial.id ? { ...item, is_public: nextValue } : item,
        ),
      );
      toast({
        title: nextValue ? 'Témoignage publié' : 'Témoignage masqué',
        description: nextValue
          ? 'Le témoignage est visible sur le site public.'
          : 'Le témoignage n’apparaîtra plus sur la page publique.',
      });
    } catch (err) {
      console.error('Failed to toggle testimonial visibility:', err);
      toast({
        title: 'Impossible de changer la visibilité',
        description:
          err instanceof Error ? err.message : "Une erreur inattendue s'est produite.",
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = (testimonial) => {
    if (!testimonial || !canDelete) return;
    setDeleteTarget(testimonial);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canDelete) return;
    setDeleteLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Témoignage supprimé',
        description: 'Le témoignage a été définitivement supprimé.',
      });
      setTestimonials((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete testimonial:', err);
      toast({
        title: 'Échec de la suppression',
        description:
          err instanceof Error ? err.message : "Une erreur inattendue s'est produite.",
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!hasPermission(VIEW_PERMISSION)) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="glass-effect">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Gestion des témoignages</CardTitle>
                <CardDescription>
                  Modérez les avis déposés par les utilisateurs et choisissez ceux qui sont visibles publiquement.
                </CardDescription>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
              <div className="relative md:min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher par auteur, rôle ou contenu..."
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-[220px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
                {error}
              </div>
            ) : filteredTestimonials.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p>Aucun témoignage ne correspond à vos filtres.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">Auteur</TableHead>
                      <TableHead>Contenu</TableHead>
                      <TableHead className="w-[120px] text-center">Note</TableHead>
                      <TableHead className="w-[160px] text-center">Statut</TableHead>
                      <TableHead className="w-[160px]">Dernière mise à jour</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTestimonials.map((testimonial) => {
                      const profile = testimonial.profile;
                      const authorLabel =
                        testimonial.author_name ||
                        `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
                        'Auteur inconnu';
                      const authorEmail = profile?.email;
                      const userRole = profile?.user_types?.type_name;
                      const statusLabel = testimonial.is_public ? 'Publié' : 'En attente';
                      const statusVariant = testimonial.is_public ? 'default' : 'secondary';

                      return (
                        <TableRow key={testimonial.id}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{authorLabel}</span>
                              {testimonial.author_role ? (
                                <span className="text-xs text-muted-foreground">
                                  {testimonial.author_role}
                                </span>
                              ) : null}
                              {authorEmail ? (
                                <span className="text-xs text-muted-foreground">{authorEmail}</span>
                              ) : null}
                              {userRole ? (
                                <Badge variant="outline" className="w-fit text-xs">
                                  {userRole}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xl whitespace-pre-wrap text-sm leading-relaxed">
                            {testimonial.content}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-sm">
                              {testimonial.rating ?? '—'} / 5
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Badge variant={statusVariant} className="text-xs">
                                {statusLabel}
                              </Badge>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium">Visible</span>
                                <Switch
                                  checked={testimonial.is_public === true}
                                  onCheckedChange={(next) =>
                                    handleToggleVisibility(testimonial, next)
                                  }
                                  disabled={!canEdit}
                                  aria-label="Basculer la visibilité publique"
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(testimonial.updated_at || testimonial.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(testimonial)}
                                disabled={!canEdit}
                                aria-label="Modifier le témoignage"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(testimonial)}
                                disabled={!canDelete}
                                aria-label="Supprimer le témoignage"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => (open ? setIsEditDialogOpen(true) : closeEditDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le témoignage</DialogTitle>
            <DialogDescription>
              Ajustez le contenu avant de publier ou de masquer le témoignage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="testimonial-author-name">Nom complet</Label>
                <Input
                  id="testimonial-author-name"
                  value={formState.authorName}
                  onChange={(event) => handleFormChange('authorName', event.target.value)}
                  placeholder="Nom affiché"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonial-author-role">Rôle (optionnel)</Label>
                <Input
                  id="testimonial-author-role"
                  value={formState.authorRole}
                  onChange={(event) => handleFormChange('authorRole', event.target.value)}
                  placeholder="Ex. COO, HexaTech"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <div className="flex flex-wrap gap-2">
                {ratingOptions.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={formState.rating === option ? 'default' : 'outline'}
                    onClick={() => handleFormChange('rating', option)}
                    className="h-9 min-w-[48px]"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-content">Contenu</Label>
              <Textarea
                id="testimonial-content"
                value={formState.content}
                onChange={(event) => handleFormChange('content', event.target.value)}
                rows={6}
                placeholder="Décrivez l'expérience ou les résultats obtenus..."
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Afficher sur le site public</p>
                <p className="text-xs text-muted-foreground">
                  Les témoignages publiés sont visibles sur le bloc &laquo;&nbsp;home.testimonials&nbsp;&raquo;.
                </p>
              </div>
              <Switch
                checked={formState.isPublic}
                onCheckedChange={(next) => handleFormChange('isPublic', next)}
                disabled={!canEdit}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeEditDialog}>
              Annuler
            </Button>
            <Button onClick={handleSaveChanges} disabled={!canEdit}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce témoignage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le témoignage sera supprimé définitivement de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TestimonialsManagementPanel;
