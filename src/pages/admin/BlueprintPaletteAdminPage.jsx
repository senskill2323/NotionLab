import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Plus, Pencil, Trash2, RefreshCcw, Palette as PaletteIcon } from 'lucide-react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  upsertPaletteFamily,
  deletePaletteFamily,
  upsertPaletteItem,
  deletePaletteItem,
} from '@/lib/blueprints/blueprintApi';

const defaultFamilyFormValues = {
  id: null,
  label: '',
  description: '',
  sortOrder: 0,
  isActive: true,
};

const defaultItemFormValues = {
  id: null,
  label: '',
  description: '',
  sortOrder: 0,
  familyId: '',
  isActive: true,
};

const BlueprintPaletteAdminPage = () => {
  const { toast } = useToast();
  const [families, setFamilies] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [familySubmitting, setFamilySubmitting] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [familyToEdit, setFamilyToEdit] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [familyToDelete, setFamilyToDelete] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deletingFamily, setDeletingFamily] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);

  const familyForm = useForm({ defaultValues: defaultFamilyFormValues });
  const itemForm = useForm({ defaultValues: defaultItemFormValues });

  const loadPaletteData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: familiesData, error: familiesError }, { data: itemsData, error: itemsError }] = await Promise.all([
        supabase.from('blueprint_palette_families').select('*').order('sort_order', { ascending: true }).order('label', { ascending: true }),
        supabase.from('blueprint_palette_items').select('*').order('sort_order', { ascending: true }).order('label', { ascending: true }),
      ]);

      if (familiesError || itemsError) {
        throw familiesError || itemsError;
      }

      setFamilies(familiesData ?? []);
      setItems(itemsData ?? []);
    } catch (error) {
      console.error('loadPaletteData', error);
      toast({ title: 'Erreur', description: "Impossible de charger la palette Blueprint.", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPaletteData();
  }, [loadPaletteData]);

  const familyMap = useMemo(() => {
    const map = new Map();
    families.forEach((family) => {
      map.set(family.id, family);
    });
    return map;
  }, [families]);

  const itemsWithFamily = useMemo(() =>
    items.map((item) => ({
      ...item,
      familyLabel: familyMap.get(item.family_id)?.label ?? '—',
    })),
  [items, familyMap]);

  const openCreateFamilyDialog = () => {
    setFamilyToEdit(null);
    familyForm.reset(defaultFamilyFormValues);
    setFamilyDialogOpen(true);
  };

  const openEditFamilyDialog = (family) => {
    setFamilyToEdit(family);
    familyForm.reset({
      id: family.id,
      label: family.label ?? '',
      description: family.description ?? '',
      sortOrder: family.sort_order ?? 0,
      isActive: !!family.is_active,
    });
    setFamilyDialogOpen(true);
  };

  const submitFamily = familyForm.handleSubmit(async (values) => {
    setFamilySubmitting(true);
    try {
      const payload = {
        id: values.id,
        label: values.label?.trim() ?? '',
        description: values.description?.trim() || null,
        sortOrder: Number(values.sortOrder) || 0,
        isActive: !!values.isActive,
      };

      if (!payload.label) {
        toast({ title: 'Validation', description: 'Le libellé est obligatoire.', variant: 'destructive' });
        setFamilySubmitting(false);
        return;
      }

      await upsertPaletteFamily(payload);
      toast({ title: 'Succès', description: 'Famille enregistrée.' });
      setFamilyDialogOpen(false);
      setFamilyToEdit(null);
      familyForm.reset(defaultFamilyFormValues);
      await loadPaletteData();
    } catch (error) {
      console.error('submitFamily', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer la famille.", variant: 'destructive' });
    } finally {
      setFamilySubmitting(false);
    }
  });

  const openCreateItemDialog = () => {
    setItemToEdit(null);
    itemForm.reset({
      ...defaultItemFormValues,
      familyId: families[0]?.id ?? '',
    });
    setItemDialogOpen(true);
  };

  const openEditItemDialog = (item) => {
    setItemToEdit(item);
    itemForm.reset({
      id: item.id,
      label: item.label ?? '',
      description: item.description ?? '',
      sortOrder: item.sort_order ?? 0,
      familyId: item.family_id ?? '',
      isActive: !!item.is_active,
    });
    setItemDialogOpen(true);
  };

  const submitItem = itemForm.handleSubmit(async (values) => {
    setItemSubmitting(true);
    try {
      const payload = {
        id: values.id,
        familyId: values.familyId || null,
        label: values.label?.trim() ?? '',
        description: values.description?.trim() || null,
        sortOrder: Number(values.sortOrder) || 0,
        isActive: !!values.isActive,
      };

      if (!payload.familyId) {
        toast({ title: 'Validation', description: 'Sélectionnez une famille.', variant: 'destructive' });
        setItemSubmitting(false);
        return;
      }

      if (!payload.label) {
        toast({ title: 'Validation', description: 'Le libellé est obligatoire.', variant: 'destructive' });
        setItemSubmitting(false);
        return;
      }

      await upsertPaletteItem(payload);
      toast({ title: 'Succès', description: "Bloc enregistré." });
      setItemDialogOpen(false);
      setItemToEdit(null);
      itemForm.reset(defaultItemFormValues);
      await loadPaletteData();
    } catch (error) {
      console.error('submitItem', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer le bloc.", variant: 'destructive' });
    } finally {
      setItemSubmitting(false);
    }
  });

  const confirmDeleteFamily = async () => {
    if (!familyToDelete) return;
    setDeletingFamily(true);
    try {
      await deletePaletteFamily(familyToDelete.id);
      toast({ title: 'Succès', description: 'Famille supprimée.' });
      setFamilyToDelete(null);
      await loadPaletteData();
    } catch (error) {
      console.error('deleteFamily', error);
      toast({ title: 'Erreur', description: "Impossible de supprimer la famille.", variant: 'destructive' });
    } finally {
      setDeletingFamily(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setDeletingItem(true);
    try {
      await deletePaletteItem(itemToDelete.id);
      toast({ title: 'Succès', description: 'Bloc supprimé.' });
      setItemToDelete(null);
      await loadPaletteData();
    } catch (error) {
      console.error('deleteItem', error);
      toast({ title: 'Erreur', description: "Impossible de supprimer le bloc.", variant: 'destructive' });
    } finally {
      setDeletingItem(false);
    }
  };

  const renderStatusBadge = (isActive) => (
    <Badge variant={isActive ? 'secondary' : 'outline'} className={isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : ''}>
      {isActive ? 'Actif' : 'Inactif'}
    </Badge>
  );

  return (
    <>
      <Helmet>
        <title>Palette Blueprint | Admin</title>
        <meta name="description" content="Admin - gestion de la palette Blueprint Notion." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <PaletteIcon className="h-6 w-6 text-primary" /> Palette Blueprint Notion
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez les familles et les blocs disponibles dans la palette du builder Blueprint.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadPaletteData} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Rafraîchir
            </Button>
            <Button onClick={openCreateFamilyDialog}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle famille
            </Button>
            <Button variant="secondary" onClick={openCreateItemDialog} disabled={families.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau bloc
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Familles ({families.length})</CardTitle>
                <CardDescription>Structure principale de la palette. Les familles inactives ne s'affichent pas côté client.</CardDescription>
              </CardHeader>
              <CardContent>
                {families.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune famille configurée. Créez-en une pour commencer.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Famille</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-24">Ordre</TableHead>
                          <TableHead className="w-20 text-center">Statut</TableHead>
                          <TableHead className="w-24 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {families.map((family) => (
                          <TableRow key={family.id}>
                            <TableCell className="font-medium">{family.label}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{family.description || '—'}</TableCell>
                            <TableCell>{family.sort_order ?? 0}</TableCell>
                            <TableCell className="text-center">{renderStatusBadge(family.is_active)}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditFamilyDialog(family)} aria-label={`Modifier ${family.label}`}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setFamilyToDelete(family)} aria-label={`Supprimer ${family.label}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Blocs ({items.length})</CardTitle>
                <CardDescription>Blocs disponibles dans chaque famille. Un bloc inactif est masqué dans le builder.</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun bloc configuré. Ajoutez un bloc pour enrichir la palette.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bloc</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Famille</TableHead>
                          <TableHead className="w-24">Ordre</TableHead>
                          <TableHead className="w-20 text-center">Statut</TableHead>
                          <TableHead className="w-24 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemsWithFamily.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.label}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.description || '—'}</TableCell>
                            <TableCell>{item.familyLabel}</TableCell>
                            <TableCell>{item.sort_order ?? 0}</TableCell>
                            <TableCell className="text-center">{renderStatusBadge(item.is_active)}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditItemDialog(item)} aria-label={`Modifier ${item.label}`}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} aria-label={`Supprimer ${item.label}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      <Dialog open={familyDialogOpen} onOpenChange={setFamilyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{familyToEdit ? 'Modifier la famille' : 'Nouvelle famille'}</DialogTitle>
            <DialogDescription>Définissez le libellé, la description et l’ordre d’affichage.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitFamily} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="family-label">Libellé</Label>
              <Input id="family-label" placeholder="Ex. Bases de données" {...familyForm.register('label')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="family-description">Description</Label>
              <Textarea id="family-description" rows={3} placeholder="Description visible côté admin" {...familyForm.register('description')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="family-sort">Ordre</Label>
                <Input id="family-sort" type="number" {...familyForm.register('sortOrder', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={familyForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      <span className="text-sm text-muted-foreground">{field.value ? 'Actif' : 'Inactif'}</span>
                    </div>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFamilyDialogOpen(false)} disabled={familySubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={familySubmitting}>
                {familySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{itemToEdit ? 'Modifier le bloc' : 'Nouveau bloc'}</DialogTitle>
            <DialogDescription>Associez un bloc à une famille et décrivez-le pour la palette.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitItem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-label">Libellé</Label>
              <Input id="item-label" placeholder="Ex. Base Tâches" {...itemForm.register('label')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea id="item-description" rows={3} placeholder="Aide contextuelle pour le bloc" {...itemForm.register('description')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Famille</Label>
                <Controller
                  control={itemForm.control}
                  name="familyId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une famille" />
                      </SelectTrigger>
                      <SelectContent>
                        {families.map((family) => (
                          <SelectItem key={family.id} value={family.id}>
                            {family.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-sort">Ordre</Label>
                <Input id="item-sort" type="number" {...itemForm.register('sortOrder', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={itemForm.control}
                name="isActive"
                render={({ field }) => (
                  <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm text-muted-foreground">{field.value ? 'Actif' : 'Inactif'}</span>
                  </div>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setItemDialogOpen(false)} disabled={itemSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={itemSubmitting || families.length === 0}>
                {itemSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!familyToDelete} onOpenChange={(open) => !open && setFamilyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette famille ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les blocs associés seront également supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingFamily}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFamily} disabled={deletingFamily} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingFamily && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bloc ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce bloc ne sera plus disponible dans le builder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingItem}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} disabled={deletingItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlueprintPaletteAdminPage;