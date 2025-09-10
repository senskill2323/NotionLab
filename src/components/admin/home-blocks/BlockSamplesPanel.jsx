import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import {
  Search, Plus, Eye, MoreVertical, Loader2, AlertCircle, Code, Layers, Edit, Trash2, Monitor, Smartphone,
  Sparkles, Star, Crown, Zap, Heart, Trophy, Gift, Gem, Shield, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import ImageUpload from '@/components/ui/image-upload';
import CozySpaceSection from '@/components/home/CozySpaceSection';

const BlockSamplesPanel = () => {
  const { toast } = useToast();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSample, setEditingSample] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [form, setForm] = useState({
    title: '',
    description: '',
    badgeText: '',
    badgeIcon: 'Sparkles',
    titleText: '',
    descriptionText: '',
    imageUrl: '',
    imageAlt: '',
    showBadge: true,
  });

  const PERSIST_KEY = 'blockSampleEditorState';

  // Bibliothèque d'icônes pour les badges
  const badgeIcons = [
    { name: 'Sparkles', icon: Sparkles, label: 'Étincelles' },
    { name: 'Star', icon: Star, label: 'Étoile' },
    { name: 'Crown', icon: Crown, label: 'Couronne' },
    { name: 'Zap', icon: Zap, label: 'Éclair' },
    { name: 'Heart', icon: Heart, label: 'Cœur' },
    { name: 'Trophy', icon: Trophy, label: 'Trophée' },
    { name: 'Gift', icon: Gift, label: 'Cadeau' },
    { name: 'Gem', icon: Gem, label: 'Gemme' },
    { name: 'Shield', icon: Shield, label: 'Bouclier' },
    { name: 'Rocket', icon: Rocket, label: 'Fusée' }
  ];

  // Modèle intégré par défaut: Accueil - Espace Confortable
  const builtinSamples = [
    {
      id: 'builtin-cozy-space',
      title: 'Accueil - Espace Confortable',
      description: 'Section accueil chaleureuse (Cozy Space) prête à l\'emploi',
      block_type: 'dynamic',
      layout: 'home.cozy_space',
      created_at: new Date().toISOString(),
      content: {}
    }
  ];

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('block_samples')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSamples([ ...builtinSamples, ...(data || []) ]);
    } catch (err) {
      console.error("Error fetching block samples:", err);
      setError("Erreur lors de la récupération des modèles de blocs.");
      toast({ title: "Erreur", description: "Impossible de charger les modèles de blocs.", variant: "destructive" });
      // Fallback: afficher au moins le modèle intégré
      setSamples(builtinSamples);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const handleAction = (actionName) => {
    toast({
      title: '🚧 Bientôt disponible!',
      description: `La fonctionnalité "${actionName}" est en cours de développement.`,
    });
  };

  const handleUseTemplate = async (sample) => {
    console.log('handleUseTemplate called with:', sample);
    try {
      const blockData = {
        title: `${sample.title} (Copie)`,
        content: sample.content || {},
        status: 'draft',
        type: 'hero',
        block_type: sample.block_type,
        layout: sample.layout,
        order_index: 0,
        priority: 0,
      };
      console.log('blockData prepared:', blockData);

      // Déterminer un order_index unique (éviter la contrainte content_blocks_order_index_unique_active)
      try {
        const { data: rows, error: maxErr } = await supabase
          .from('content_blocks')
          .select('order_index')
          .neq('status', 'archived')
          .eq('layout', blockData.layout)
          .order('order_index', { ascending: false })
          .limit(1);
        if (!maxErr && Array.isArray(rows) && rows.length > 0 && typeof rows[0].order_index === 'number') {
          blockData.order_index = (rows[0].order_index || 0) + 1;
        } else {
          // Fallback si aucune ligne retournée
          blockData.order_index = 1;
        }
      } catch (e) {
        console.warn('order_index fetch failed, fallback to timestamp', e);
        blockData.order_index = Math.floor(Date.now() / 1000);
      }

      // Tenter l'insertion avec retries si collision d'unicité (erreur 23505)
      let insertError = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await supabase
          .from('content_blocks')
          .insert([blockData])
          .select()
          .single();
        if (!error) {
          toast({ title: 'Succès', description: `Bloc "${blockData.title}" créé en brouillon.` });
          insertError = null;
          break;
        }
        insertError = error;
        if (error?.code === '23505' || String(error?.message || '').includes('content_blocks_order_index_unique_active')) {
          // collision: incrémenter et retenter
          blockData.order_index = (blockData.order_index || 0) + 1;
          continue;
        } else {
          break;
        }
      }
      if (insertError) throw insertError;
    } catch (error) {
      toast({ title: 'Erreur', description: `Impossible de créer le bloc: ${error.message}`, variant: 'destructive' });
    }
  };

  const handleEdit = (sample) => {
    const c = sample?.content || {};
    setEditingSample(sample);
    setForm({
      title: sample.title || '',
      description: sample.description || '',
      badgeText: c.badgeText || 'Votre Espace Privilégié',
      badgeIcon: c.badgeIcon || 'Sparkles',
      titleText: c.title || 'Installez-vous confortablement dans votre espace de formation',
      descriptionText: c.description || "J'ai mis le paquet sur votre espace personnel. Contrairement à d'autres plateformes, ici, tout est pensé pour être une extension de votre propre espace de travail. C'est un lieu pour apprendre, expérimenter et interagir, sans jamais vous sentir perdu.",
      imageUrl: c.imageUrl || 'https://images.unsplash.com/photo-1590177600178-c2597bd63ea7',
      imageAlt: c.imageAlt || "Un espace de travail moderne et confortable avec un ordinateur portable ouvert sur une application de formation",
      showBadge: c.showBadge !== false,
    });
    setIsEditOpen(true);
  };

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const getPreviewContent = () => ({
    badgeText: form.badgeText,
    badgeIcon: form.badgeIcon,
    title: form.titleText,
    description: form.descriptionText,
    imageUrl: form.imageUrl,
    imageAlt: form.imageAlt,
    showBadge: form.showBadge,
  });

  const handleSaveTemplate = async () => {
    try {
      const payload = {
        title: form.title,
        description: form.description,
        block_type: editingSample?.block_type || 'dynamic',
        layout: editingSample?.layout || 'home.cozy_space',
        content: {
          badgeText: form.badgeText,
          badgeIcon: form.badgeIcon,
          title: form.titleText,
          description: form.descriptionText,
          imageUrl: form.imageUrl,
          imageAlt: form.imageAlt,
          showBadge: form.showBadge,
        },
      };

      if (!editingSample?.id || String(editingSample.id).startsWith('builtin-')) {
        const { error } = await supabase.from('block_samples').insert([payload]);
        if (error) throw error;
        toast({ title: 'Succès', description: 'Modèle enregistré.' });
      } else {
        const { error } = await supabase.from('block_samples').update(payload).eq('id', editingSample.id);
        if (error) throw error;
        toast({ title: 'Succès', description: 'Modèle mis à jour.' });
      }
      setIsEditOpen(false);
      setEditingSample(null);
      fetchSamples();
    } catch (err) {
      toast({ title: 'Erreur', description: `Impossible d'enregistrer le modèle: ${err.message}`, variant: 'destructive' });
    }
  };

  // Persist editor state to survive tab switches / focus changes
  useEffect(() => {
    const state = {
      isEditOpen,
      editingSampleId: editingSample?.id || null,
      form,
      previewMode,
    };
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore storage errors
    }
  }, [isEditOpen, editingSample, form, previewMode]);

  // Restore editor state when samples are loaded
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.previewMode) setPreviewMode(saved.previewMode);
      if (saved?.form) setForm(prev => ({ ...prev, ...saved.form }));
      if (saved?.isEditOpen) {
        if (saved.editingSampleId) {
          const smp = samples.find(s => s.id === saved.editingSampleId);
          if (smp) setEditingSample(smp);
        }
        setIsEditOpen(true);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [samples]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-xl font-semibold">Bibliothèque de modèles de Blocs</h2>
        <Button className="rounded-full bg-red-600 hover:bg-red-700 text-white focus:ring-red-500" onClick={() => handleAction('Ajouter un modèle')}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un modèle
        </Button>
      </div>

      <div className="bg-muted/50 dark:bg-card/30 p-4 rounded-lg space-y-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un modèle..."
            className="pl-10"
            onChange={() => handleAction('Recherche')}
          />
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Titre</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-red-500"><AlertCircle className="mx-auto h-6 w-6 mb-2" />{error}</TableCell></TableRow>
            ) : samples.length > 0 ? (
              samples.map(sample => (
                <TableRow key={sample.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{sample.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sample.description || '-'}</TableCell>
                  <TableCell>
                     <Badge variant={sample.block_type === 'dynamic' ? 'outline' : 'default'} className="flex items-center gap-1 w-fit">
                      {sample.block_type === 'dynamic' ? <Layers className="h-3 w-3" /> : <Code className="h-3 w-3" />}
                      {sample.block_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{sample.layout}</TableCell>
                  <TableCell>{format(new Date(sample.created_at), 'dd MMM yyyy', { locale: fr })}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUseTemplate(sample)}>
                          <span>Utiliser ce modèle</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(sample)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Éditer</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('Prévisualiser')}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Prévisualiser</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleAction('Supprimer')}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Supprimer</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun modèle de bloc trouvé. Créez-en un pour commencer !</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          className="max-w-[95vw] w-full h-[95vh] max-h-[95vh]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Éditer le modèle: {form.title || editingSample?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex h-full gap-6 overflow-hidden">
            <div className="w-[26rem] flex-shrink-0 space-y-4 overflow-y-auto pr-2">
              <div>
                <Label>Titre du modèle</Label>
                <Input value={form.title} onChange={handleChange('title')} />
              </div>
              <div>
                <Label>Description du modèle</Label>
                <Textarea value={form.description} onChange={handleChange('description')} rows={2} />
              </div>
              <div>
                <Label>Badge</Label>
                <div className="space-y-2">
                  <Input value={form.badgeText} onChange={handleChange('badgeText')} />
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Icône du badge</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {badgeIcons.map((iconItem) => {
                        const IconComponent = iconItem.icon;
                        return (
                          <button
                            key={iconItem.name}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, badgeIcon: iconItem.name }))}
                            className={`
                              p-2 rounded border-2 transition-colors flex items-center justify-center
                              ${form.badgeIcon === iconItem.name 
                                ? 'border-primary bg-primary/10' 
                                : 'border-muted hover:border-primary/50'
                              }
                            `}
                            title={iconItem.label}
                          >
                            <IconComponent className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Afficher le badge</Label>
                <Switch checked={form.showBadge} onCheckedChange={(v) => setForm(prev => ({ ...prev, showBadge: v }))} />
              </div>
              <div>
                <Label>Titre affiché</Label>
                <Input value={form.titleText} onChange={handleChange('titleText')} />
              </div>
              <div>
                <Label>Paragraphe</Label>
                <Textarea value={form.descriptionText} onChange={handleChange('descriptionText')} rows={4} />
              </div>
              <div>
                <Label>Image</Label>
                <ImageUpload
                  currentImageUrl={form.imageUrl}
                  onImageSelected={(url) => setForm(prev => ({ ...prev, imageUrl: url }))}
                  bucketName="block-images"
                  cropAspectRatio={16/9}
                />
              </div>
              <div>
                <Label>Texte alternatif</Label>
                <Input value={form.imageAlt} onChange={handleChange('imageAlt')} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveTemplate}>Enregistrer</Button>
                <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Prévisualisation</span>
                <ToggleGroup type="single" value={previewMode} onValueChange={(v) => v && setPreviewMode(v)}>
                  <ToggleGroupItem value="mobile" aria-label="Aperçu mobile">
                    <Smartphone className="h-4 w-4 mr-1" /> Mobile
                  </ToggleGroupItem>
                  <ToggleGroupItem value="desktop" aria-label="Aperçu desktop">
                    <Monitor className="h-4 w-4 mr-1" /> Desktop
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex-1 overflow-auto border rounded-xl bg-background">
                <div className={`${previewMode === 'mobile' ? 'w-[390px] mx-auto' : 'w-full'} h-full`}>
                  <CozySpaceSection
                    content={getPreviewContent()}
                    previewMode={previewMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default BlockSamplesPanel;