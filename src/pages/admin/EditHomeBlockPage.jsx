 
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import HomeBlockLayoutEditor from '@/components/admin/home-blocks/HomeBlockLayoutEditor';
import {
  getDefaultEditorState,
  getLayoutDefinition,
  serializeLayoutContent,
  deserializeLayoutContent,
} from '@/components/admin/home-blocks/layoutRegistry';

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
      layout: 'home.main_hero',
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
  const layout = watch('layout');

  const [layoutEditorState, setLayoutEditorState] = useState(() => {
    const definition = getLayoutDefinition(layout);
    return definition ? getDefaultEditorState(layout) : {};
  });
  const [layoutSerializedContent, setLayoutSerializedContent] = useState(() => {
    const definition = getLayoutDefinition(layout);
    if (!definition) {
      return null;
    }
    return serializeLayoutContent(layout, getDefaultEditorState(layout));
  });
  const [fallbackJson, setFallbackJson] = useState('');
  const previousLayoutRef = useRef(null);
  const previousBlockTypeRef = useRef(blockType);

  const handleLayoutEditorChange = useCallback((nextValue) => {
    setLayoutEditorState(nextValue);
  }, []);

  const handleLayoutContentChange = useCallback((nextContent) => {
    setLayoutSerializedContent(nextContent);
  }, []);

  const handleFallbackJsonChange = useCallback(
    (nextJson) => {
      setFallbackJson(nextJson);
      if (!getLayoutDefinition(layout)) {
        try {
          const parsed = JSON.parse(nextJson);
          setLayoutSerializedContent(parsed);
        } catch (error) {
          // ignore invalid JSON until it parses
        }
      }
    },
    [layout],
  );

  const buildBlockPayload = useCallback(

    (formValues, content, overrides = {}) => {

      const effectiveStatus = overrides.status ?? formValues.status;

      const layoutDefinition = overrides.layoutDefinition;

      const normalizedLayout =

        layoutDefinition?.id ?? formValues.layout ?? null;

      const normalizedBlockType =

        layoutDefinition?.blockType ?? formValues.block_type ?? 'dynamic';



      const metadata = {

        title: formValues.title,

        status: effectiveStatus,

        type: formValues.type,

        block_type: normalizedBlockType,

        layout: normalizedLayout,

        order_index: formValues.order_index,

        priority: formValues.priority,

        author_id: overrides.authorId ?? (user?.id ?? null),

        publication_date: formValues.publication_date,

        end_date: formValues.end_date,

        tags: formValues.tags,

        audience_mode: formValues.audience_mode,

        visibility_authenticated: formValues.visibility_authenticated,

        visibility_roles: formValues.visibility_roles,

      };



      return { metadata, content };

    },

    [user?.id],

  );



  useEffect(() => {
    const blockTypeChanged = previousBlockTypeRef.current !== blockType;
    previousBlockTypeRef.current = blockType;

    if (blockType !== 'dynamic') {
      setLayoutEditorState({});
      setLayoutSerializedContent(null);
      setFallbackJson('');
      previousLayoutRef.current = layout;
      return;
    }

    const layoutChanged = previousLayoutRef.current !== layout;

    if (!layoutChanged && !blockTypeChanged) {
      return;
    }

    const definition = getLayoutDefinition(layout);

    if (definition) {
      const defaultState = getDefaultEditorState(layout);
      setLayoutEditorState(defaultState);
      setLayoutSerializedContent(serializeLayoutContent(layout, defaultState));
      setFallbackJson('');
    } else {
      const emptyState = {};
      setLayoutEditorState(emptyState);
      setLayoutSerializedContent(emptyState);
      setFallbackJson(JSON.stringify(emptyState, null, 2));
    }

    previousLayoutRef.current = layout;
  }, [blockType, layout]);
  useEffect(() => {
    if (isNew) {
      if (blockType !== 'dynamic') {
        setLayoutEditorState({});
        setLayoutSerializedContent(null);
        setFallbackJson('');
      }
      return;
    }

    let isMounted = true;

    const fetchBlock = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('id', blockId)
        .single();

      if (!isMounted) {
        return;
      }

      if (error) {
        setLoading(false);
        toast({ title: 'Erreur', description: "Impossible de charger le bloc.", variant: 'destructive' });
        onBack();
        return;
      }

      reset({
        ...data,
        publication_date: data.publication_date ? new Date(data.publication_date) : null,
      });

      if (data.block_type === 'dynamic') {
        const definition = getLayoutDefinition(data.layout);
        if (definition) {
          const deserialized = deserializeLayoutContent(data.layout, data.content);
          setLayoutEditorState(deserialized);
          setLayoutSerializedContent(serializeLayoutContent(data.layout, deserialized));
          setFallbackJson('');
        } else {
          const fallbackState =
            data && typeof data.content === 'object' && data.content !== null ? data.content : {};
          setLayoutEditorState(fallbackState);
          setLayoutSerializedContent(
            typeof data.content === 'string' ? data.content : fallbackState,
          );
          setFallbackJson(
            typeof data.content === 'string'
              ? data.content
              : JSON.stringify(fallbackState, null, 2),
          );
        }
      } else {
        setLayoutEditorState({});
        setLayoutSerializedContent(null);
        setFallbackJson('');
      }

      previousLayoutRef.current = data.layout;
      previousBlockTypeRef.current = data.block_type;
      setLoading(false);
    };

    fetchBlock();

    return () => {
      isMounted = false;
    };
  }, [blockId, blockType, isNew, onBack, reset, toast]);
  const onSubmit = async (formData, status) => {
    setIsSubmitting(true);

    try {

      const layoutDefinition = getLayoutDefinition(formData.layout);

      const normalizedLayout = layoutDefinition?.id ?? formData.layout;

      const normalizedBlockType =

        layoutDefinition?.blockType ?? formData.block_type ?? 'dynamic';



      let contentPayload = formData.content || '';



      if (normalizedBlockType === 'dynamic') {

        if (layoutSerializedContent == null) {

          toast({

            title: 'Contenu incomplet',

            description: 'Impossible de s?rialiser le contenu du bloc. V?rifiez les donn?es avant de sauvegarder.',

            variant: 'destructive',

          });

          setIsSubmitting(false);

          return;

        }

        contentPayload = layoutSerializedContent;

      }



      const effectiveStatus = status || formData.status;

      const payload = buildBlockPayload(formData, contentPayload, {

        status: effectiveStatus,

        layoutDefinition: layoutDefinition || { id: normalizedLayout, blockType: normalizedBlockType },

      });



      if (isNew && payload.metadata.block_type === 'html') {
        const blockDataForHtml = {
          ...payload.metadata,
          content: payload.content,
        };

        const { data: newId, error: rpcError } = await supabase.rpc('home_blocks_create_html', {
          p_title: blockDataForHtml.title,
          p_content: blockDataForHtml.content || '',
          p_layout: blockDataForHtml.layout,
          p_type: blockDataForHtml.type,
          p_status: effectiveStatus,
          p_priority: blockDataForHtml.priority ?? 0,
        });
        if (rpcError) throw rpcError;

        toast({ title: 'Succ�s', description: `Bloc sauvegard� en tant que ${effectiveStatus}.` });
        onSave({ id: newId, ...blockDataForHtml });
      } else {
        const { data, error } = await supabase.functions.invoke('manage-content-block', {
          body: {
            blockId: isNew ? null : blockId,
            metadata: payload.metadata,
            content: payload.content,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const resultingBlock = data ?? { ...payload.metadata, content: payload.content };
        toast({ title: 'Succ�s', description: `Bloc sauvegard� en tant que ${resultingBlock.status ?? effectiveStatus}.` });
        onSave(resultingBlock);
      }
    } catch (error) {
      toast({ title: 'Erreur', description: `�chec de la sauvegarde: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  // All layouts editable

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
                            render={({ field }) => (
                              <TiptapEditor
                                content={field.value}
                                onChange={field.onChange}
                                placeholder="Saisissez le contenu du bloque ici..."
                              />
                            )}
                          />
                        ) : (
                          <HomeBlockLayoutEditor
                            layout={layout}
                            value={layoutEditorState}
                            onChange={handleLayoutEditorChange}
                            onContentChange={handleLayoutContentChange}
                            previewMode="desktop"
                            fallbackJson={fallbackJson}
                            onFallbackJsonChange={handleFallbackJsonChange}
                          />
                        )}

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
                              <SelectItem value="home.main_hero">home.main_hero</SelectItem>
                              <SelectItem value="home.systems_showcase">home.systems_showcase</SelectItem>
                              <SelectItem value="home.stats">home.stats</SelectItem>
                              <SelectItem value="home.formations">home.formations</SelectItem>
                              <SelectItem value="home.support">home.support</SelectItem>
                              <SelectItem value="home.promise">home.promise</SelectItem>
                              <SelectItem value="home.cozy_space">home.cozy_space</SelectItem>
                              <SelectItem value="home.personal_quote">home.personal_quote</SelectItem>
                              <SelectItem value="home.final_cta">home.final_cta</SelectItem>
                              <SelectItem value="home.launch_cta">home.launch_cta</SelectItem>
                              <SelectItem value="global.footer">global.footer</SelectItem>
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

                  {blockType === 'html' && (
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
                  )}

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
