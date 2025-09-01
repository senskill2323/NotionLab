import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TiptapEditor from '@/components/admin/TiptapEditor';
import { ArrowLeft, CalendarPlus as CalendarIcon, Loader2, Upload, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';

const EditHomeBlockPage = ({ blockId, onBack, onSave }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isNew = !blockId;

  const [loading, setLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      content: '',
      status: 'draft',
      type: 'hero',
      block_type: 'html',
      layout: 'home.header',
      order_index: 0,
      priority: 0,
      author_id: user?.id,
      publication_date: null,
      end_date: null,
      tags: [],
      audience_mode: 'public',
      visibility_authenticated: false,
      visibility_roles: [],
    }
  });

  const blockType = watch('block_type');

  useEffect(() => {
    if (!isNew) {
      const fetchBlock = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('content_blocks')
          .select('*')
          .eq('id', blockId)
          .single();

        if (error) {
          toast({ title: 'Erreur', description: "Impossible de charger le bloc.", variant: 'destructive' });
          onBack();
        } else {
          reset({
            ...data,
            publication_date: data.publication_date ? new Date(data.publication_date) : null,
          });
        }
        setLoading(false);
      };
      fetchBlock();
    }
  }, [blockId, isNew, reset, toast, onBack]);

  const onSubmit = async (formData, status) => {
    setIsSubmitting(true);
    
    const blockData = {
      title: formData.title,
      content: formData.block_type === 'html' ? formData.content : {},
      status: status || formData.status,
      type: formData.type,
      block_type: formData.block_type,
      layout: formData.layout,
      order_index: formData.order_index,
      priority: formData.priority,
      author_id: user?.id,
      publication_date: formData.publication_date,
      tags: formData.tags,
      audience_mode: formData.audience_mode,
    };

    try {
      const { data, error } = await supabase.functions.invoke('manage-content-block', {
        body: { blockId: isNew ? null : blockId, blockData },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Succès', description: `Bloc sauvegardé en tant que ${status || formData.status}.` });
      onSave(data);

    } catch (error) {
      toast({ title: 'Erreur', description: `Échec de la sauvegarde: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleAction = (action) => {
    toast({
      title: '🚧 Fonctionnalité en cours de développement',
      description: "Cette action n'est pas encore implémentée.",
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <Helmet>
        <title>{isNew ? 'Créer un bloc' : 'Modifier le bloc'} | Admin</title>
      </Helmet>
      <div>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">{isNew ? 'Proposer un bloque' : 'Modifier le bloque'}</h1>
          <div className="flex flex-col md:flex-row gap-2">
            <Button variant="ghost" onClick={onBack}>Annuler</Button>
            <Button variant="secondary" onClick={handleSubmit(d => onSubmit(d, 'draft'))} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sauver en brouillon
            </Button>
            <Button onClick={handleSubmit(d => onSubmit(d, 'published'))} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? 'Publier' : 'Mettre à jour'}
            </Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la gestion des bloques
            </Button>
          </div>
        </header>

        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Détail du bloque</TabsTrigger>
            <TabsTrigger value="gallery_images" disabled>Galerie des images</TabsTrigger>
            <TabsTrigger value="gallery_docs" disabled>Galerie des documents</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <form>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div>
                        <Label htmlFor="title">Titre*</Label>
                        <Input id="title" {...register('title', { required: 'Le titre est requis' })} />
                        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                      </div>
                      <div className="mt-4">
                        <Label>Corps du bloque</Label>
                        {blockType === 'html' ? (
                          <Controller
                            name="content"
                            control={control}
                            render={({ field }) => <TiptapEditor content={field.value} onChange={field.onChange} placeholder="Saisissez le contenu du bloque ici..." />}
                          />
                        ) : (
                          <div className="p-4 bg-muted rounded-md text-muted-foreground text-sm">
                            Le contenu de ce bloc est géré dynamiquement par son layout. L'édition se fera via des champs dédiés dans une future version.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Paramètres</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="block_type">Type de contenu</Label>
                        <Controller name="block_type" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="html">HTML</SelectItem>
                              <SelectItem value="dynamic">Dynamique</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div>
                        <Label>Période d’activation</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Controller name="publication_date" control={control} render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? new Date(field.value).toLocaleDateString('fr-CH') : <span>Début</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                          )} />
                           <Controller name="end_date" control={control} render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? new Date(field.value).toLocaleDateString('fr-CH') : <span>Fin (optionnel)</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                            </Popover>
                          )} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="type">Catégorie du bloque</Label>
                        <Controller name="type" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hero">Hero</SelectItem>
                              <SelectItem value="teaser">Teaser</SelectItem>
                              <SelectItem value="carousel">Carrousel</SelectItem>
                              <SelectItem value="cta">CTA</SelectItem>
                              <SelectItem value="article_list">Liste d’articles</SelectItem>
                              <SelectItem value="html">HTML libre</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div>
                        <Label htmlFor="layout">Emplacement (Layout)</Label>
                         <Controller name="layout" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="home.header">home.header</SelectItem>
                              <SelectItem value="home.grid.a1">home.grid.a1</SelectItem>
                              <SelectItem value="home.grid.b2">home.grid.b2</SelectItem>
                              <SelectItem value="home.footer">home.footer</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="order_index">Ordre d’affichage</Label>
                          <Input id="order_index" type="number" {...register('order_index', { valueAsNumber: true })} />
                        </div>
                        <div>
                          <Label htmlFor="priority">Priorité</Label>
                          <Input id="priority" type="number" {...register('priority', { valueAsNumber: true })} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Visuel principal</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center w-full">
                          <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez</p>
                              </div>
                              <input id="dropzone-file" type="file" className="hidden" onChange={() => handleAction('upload')} />
                          </label>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Button variant="outline" className="w-full" onClick={() => handleAction('crop')}>Recadrer</Button>
                        <Input placeholder="Texte alternatif (alt)" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader><CardTitle>Conditions d’affichage</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex items-center space-x-2">
                        <Controller name="visibility_authenticated" control={control} render={({ field }) => (
                          <Checkbox id="visibility_authenticated" checked={field.value} onCheckedChange={field.onChange} />
                        )} />
                        <Label htmlFor="visibility_authenticated">Utilisateur connecté</Label>
                      </div>
                      <div>
                        <Label>Rôles et permissions</Label>
                        <Button variant="outline" className="w-full mt-1" onClick={() => handleAction('select-roles')}>Sélectionner les rôles</Button>
                      </div>
                       <div>
                        <Label>Segments de groupes</Label>
                        <Button variant="outline" className="w-full mt-1" onClick={() => handleAction('select-segments')}>Sélectionner les segments</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Publication</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="status">Statut</Label>
                        <Controller name="status" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Brouillon</SelectItem>
                              <SelectItem value="ready">Prêt pour publication</SelectItem>
                              <SelectItem value="published">Publié</SelectItem>
                              <SelectItem value="archived">Archivé</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => handleAction('preview')}>
                        <Eye className="h-4 w-4 mr-2" />
                        Prévisualiser
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default EditHomeBlockPage;