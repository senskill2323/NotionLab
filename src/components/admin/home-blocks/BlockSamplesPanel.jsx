import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import {
  Pencil, Trash2, Eye, Plus, Copy, Upload, X,
  Sparkles, Star, Crown, Zap, Heart, Trophy, Gift, Gem, Shield, Rocket, ChevronDown, ChevronUp,
  Award, Bookmark, CheckCircle, Clock, Flame, Flag, Globe, Lightbulb, Lock, Mail, MapPin, Music, Target,
  Smartphone, Monitor, Layers, Code, Search, MoreVertical, Edit, Loader2, AlertCircle, Users, CalendarDays, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import ImageUpload from '@/components/ui/image-upload';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import CozySpaceSectionWithUpload from './CozySpaceSectionWithUpload';
import MainHeroSection from '@/components/home/MainHeroSection';
import SystemsShowcase from '@/components/home/SystemsShowcase';
import StatsSection from '@/components/home/StatsSection';
import FormationsSection from '@/components/home/FormationsSection';
import SupportSection from '@/components/home/SupportSection';
import PromiseSection from '@/components/home/PromiseSection';
import PersonalQuoteSection from '@/components/home/PersonalQuoteSection';
import FinalCTA from '@/components/home/FinalCTA';
import LaunchCTA from '@/components/home/LaunchCTA';
import Footer from '@/components/Footer';

const BlockSamplesPanel = ({ onBlockCreated }) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSamples, setSelectedSamples] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSample, setEditingSample] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [showBadgeIcons, setShowBadgeIcons] = useState(false);
  const [showPromiseIcons, setShowPromiseIcons] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [layoutFilter, setLayoutFilter] = useState('all');
  const [form, setForm] = useState({
    title: '',
    badgeText: '',
    badgeIcon: 'Sparkles',
    titleText: '',
    descriptionText: '',
    imageUrl: '',
    imageAlt: '',
    showBadge: true,
    ctaText: '',
    ctaUrl: '',
    showCta: false,
    backgroundColor: '',
    useDefaultBackground: true,
    contentJsonText: '',
    // Systems showcase fields
    ss_title: '',
    ss_titleSuffix: '',
    ss_images: [],
    ss_buttonText: '',
    ss_buttonLink: '',
    // Personal quote fields
    pq_quoteText: '',
    pq_showCta: false,
    pq_ctaText: '',
    pq_ctaUrl: '',
    pq_backgroundColor: '',
    pq_useDefaultBackground: true,
    // Promise section fields
    pr_title: '',
    pr_titleSuffix: '',
    pr_items: [],
    pr_showCta: false,
    pr_ctaText: '',
    pr_ctaUrl: '',
    pr_backgroundColor: '',
    pr_useDefaultBackground: true,
    pr_backgroundImage: '',
    pr_useBackgroundImage: false,
    pr_backgroundOpacity: 0.5,
  });

  // Explicit cancel/close handler to clear URL + storage and close editor
  const handleCloseEditor = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('editing');
    newSearchParams.delete('sampleId');
    setSearchParams(newSearchParams, { replace: true });
    
    try {
      sessionStorage.removeItem('blockSamplesEditor');
    } catch (e) {
      // ignore storage errors
    }
    
    setIsEditOpen(false);
    setEditingSample(null);
  }, [searchParams, setSearchParams]);

  // Handle close with save confirmation
  const handleCloseWithConfirmation = useCallback(() => {
    // Check if there are unsaved changes by comparing current form with original sample
    const hasChanges = editingSample && (
      form.title !== editingSample.title ||
      JSON.stringify(getPreviewContent()) !== JSON.stringify(editingSample.content || {})
    );

    if (hasChanges) {
      toast({
        title: 'Modifications non sauvegardées',
        description: 'Voulez-vous enregistrer vos modifications avant de fermer ?',
        action: (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                handleCloseEditor();
              }}
            >
              Fermer sans sauvegarder
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                handleSaveTemplate();
              }}
            >
              Sauvegarder et fermer
            </Button>
          </div>
        ),
      });
    } else {
      handleCloseEditor();
    }
  }, [editingSample, form, toast, handleCloseEditor]);

  // Handle dialog close events (X button, ESC, overlay click)
  const handleDialogOpenChange = useCallback((value) => {
    if (value) {
      setIsEditOpen(true);
    } else {
      // When user clicks X or presses ESC, just close directly for now
      handleCloseEditor();
    }
  }, [handleCloseEditor]);


  // Bibliothèque d'icônes pour les badges
  const badgeIcons = [
    { name: 'Sparkles', icon: Sparkles, label: 'Étincelles' },
    { name: 'Star', icon: Star, label: 'Étoile' },
    { name: 'Crown', icon: Crown, label: 'Couronne' },
    { name: 'Zap', icon: Zap, label: 'Éclair' },
    { name: 'Heart', icon: Heart, label: 'Cœur' },
  ];

  // Bibliothèque d'icônes pour les promesses
  const promiseIcons = [
    { name: 'Users', icon: Users, label: 'Utilisateurs' },
    { name: 'CalendarDays', icon: CalendarDays, label: 'Calendrier' },
    { name: 'Zap', icon: Zap, label: 'Éclair' },
    { name: 'Heart', icon: Heart, label: 'Cœur' },
    { name: 'Star', icon: Star, label: 'Étoile' },
    { name: 'Crown', icon: Crown, label: 'Couronne' },
    { name: 'Sparkles', icon: Sparkles, label: 'Étincelles' },
    { name: 'Target', icon: Target, label: 'Cible' },
    { name: 'Shield', icon: Shield, label: 'Bouclier' },
    { name: 'Award', icon: Award, label: 'Récompense' },
    { name: 'CheckCircle', icon: CheckCircle, label: 'Validation' },
    { name: 'Clock', icon: Clock, label: 'Horloge' },
    { name: 'Globe', icon: Globe, label: 'Globe' },
    { name: 'Lightbulb', icon: Lightbulb, label: 'Ampoule' },
    { name: 'Rocket', icon: Rocket, label: 'Fusée' },
    { name: 'Settings', icon: Settings, label: 'Paramètres' },
  ];

  // Presets for Launch CTA custom gradients
  const lctaGradientPresets = [
    { name: 'Sunset', start: '#ff6b35', end: '#f7931e', angle: 135 },
    { name: 'Ocean', start: '#36d1dc', end: '#5b86e5', angle: 135 },
    { name: 'Purple', start: '#a18cd1', end: '#fbc2eb', angle: 135 },
    { name: 'Forest', start: '#11998e', end: '#38ef7d', angle: 135 },
    { name: 'Fire', start: '#f12711', end: '#f5af19', angle: 135 },
    { name: 'Steel', start: '#bdc3c7', end: '#2c3e50', angle: 135 },
  ];

  // Modèles intégrés par défaut pour différents layouts (hors home.formations)
  const builtinSamples = [
    {
      id: 'builtin-cozy-space',
      title: 'Accueil - Espace Confortable',
      description: 'Section accueil chaleureuse (Cozy Space) prête à l\'emploi',
      block_type: 'dynamic',
      layout: 'home.cozy_space',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-main-hero',
      title: 'Accueil - Hero Principal',
      description: 'Hero plein écran (image de fond)',
      block_type: 'dynamic',
      layout: 'home.main_hero',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-systems-showcase',
      title: 'Accueil - Vitrine des Systèmes',
      description: 'Section de présentation des systèmes',
      block_type: 'dynamic',
      layout: 'home.systems_showcase',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-stats',
      title: 'Accueil - Statistiques',
      description: 'Métriques de la plateforme',
      block_type: 'dynamic',
      layout: 'home.stats',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-support',
      title: 'Accueil - Support',
      description: 'Section d\'assistance',
      block_type: 'dynamic',
      layout: 'home.support',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-promise',
      title: 'Accueil - Promesse',
      description: 'Section promesse',
      block_type: 'dynamic',
      layout: 'home.promise',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-personal-quote',
      title: 'Accueil - Citation personnelle',
      description: 'Section citation',
      block_type: 'dynamic',
      layout: 'home.personal_quote',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-final-cta',
      title: 'Accueil - CTA final',
      description: 'Call-to-action final',
      block_type: 'dynamic',
      layout: 'home.final_cta',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-launch-cta',
      title: 'Accueil - CTA lancement',
      description: 'Section lancement',
      block_type: 'dynamic',
      layout: 'home.launch_cta',
      created_at: new Date().toISOString(),
      content: {}
    },
    {
      id: 'builtin-footer',
      title: 'Global - Pied de page',
      description: 'Footer du site',
      block_type: 'dynamic',
      layout: 'global.footer',
      created_at: new Date().toISOString(),
      content: {}
    },
  ];

  // Seed des modèles intégrés dans la table `block_samples` (si absents)
  const seedBuiltinSamplesIfNeeded = useCallback(async () => {
    try {
      const { data: existing, error } = await supabase
        .from('block_samples')
        .select('id');
      if (error) throw error;

      // Ne seed que si la table est vide pour éviter la réapparition après suppressions explicites
      if (!existing || existing.length === 0) {
        const payloads = builtinSamples.map(s => ({
          title: s.title,
          block_type: s.block_type,
          layout: s.layout,
          content: s.content || {},
        }));
        if (payloads.length > 0) {
          const { error: insertErr } = await supabase.from('block_samples').insert(payloads);
          if (insertErr) {
            // Ne pas interrompre le flux si le seed échoue
            console.warn('Seeding builtins failed:', insertErr);
          }
        }
      }
    } catch (e) {
      console.warn('Seed builtins error:', e);
    }
  }, []);

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('block_samples')
        .select('*')
        .order('created_at', { ascending: false });

      if (debouncedQuery && debouncedQuery.trim() !== '') {
        q = q.ilike('title', `%${debouncedQuery.trim()}%`);
      }
      if (layoutFilter && layoutFilter !== 'all') {
        q = q.eq('layout', layoutFilter);
      }

      const { data, error } = await q;

      if (error) throw error;

      // N'afficher que les modèles présents en base (plus d'injection de "builtins" côté client)
      setSamples(data || []);
    } catch (err) {
      console.error("Error fetching block samples:", err);
      setError("Erreur lors de la récupération des modèles de blocs.");
      toast({ title: "Erreur", description: "Impossible de charger les modèles de blocs.", variant: "destructive" });
      // Fallback: ne rien afficher (évite la réapparition due au localStorage)
      setSamples([]);
    } finally {
      setLoading(false);
    }
  }, [toast, debouncedQuery, layoutFilter]);

  const importFromActiveBlocks = useCallback(async () => {
    try {
      const { data: blocks, error } = await supabase
        .from('content_blocks')
        .select('*')
        .neq('status', 'archived');
      if (error) throw error;

      const candidates = (blocks || []);

      // Fetch existing samples to avoid duplicates by (title + layout)
      const { data: existing, error: errExisting } = await supabase
        .from('block_samples')
        .select('id,title,layout');
      if (errExisting) throw errExisting;
      const existsKey = new Set((existing || []).map(s => `${s.title}__${s.layout}`));

      const payloads = candidates
        .filter(b => !existsKey.has(`${b.title}__${b.layout}`))
        .map(b => ({
          title: b.title,
          block_type: b.block_type || 'dynamic',
          layout: b.layout,
          content: b.block_type === 'html' ? (b.content || '') : (b.content || {}),
        }));

      if (payloads.length === 0) {
        toast({ title: 'Importation', description: 'Aucun nouveau modèle à importer.' });
        return;
      }

      const { error: insertErr } = await supabase.from('block_samples').insert(payloads);
      if (insertErr) throw insertErr;

      toast({ title: 'Succès', description: `${payloads.length} modèle(s) importé(s).` });
      fetchSamples();
    } catch (err) {
      console.error('Import error:', err);
    }
  }, [toast, fetchSamples]);

  const handleDelete = async (sampleId) => {
    toast({
      title: 'Confirmation requise',
      description: "Êtes-vous sûr de vouloir supprimer définitivement ce modèle ?",
      action: (
        <Button variant="destructive" onClick={async () => {
          try {
            const { data: sampleData, error: fetchError } = await supabase
              .from('block_samples')
              .select('title')
              .eq('id', sampleId)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
              throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
            }

            const sampleTitle = sampleData?.title || 'ce modèle';

            const { error } = await supabase
              .from('block_samples')
              .delete()
              .eq('id', sampleId);

            if (error) {
              throw error;
            }

            toast({ 
              title: "Succès", 
              description: `Le modèle "${sampleTitle}" a été supprimé définitivement.` 
            });
            fetchSamples();
          } catch (err) {
            console.error('Delete failed:', err);
            toast({ 
              title: "Erreur", 
              description: err.message || "Impossible de supprimer le modèle. Veuillez réessayer.", 
              variant: "destructive" 
            });
          }
        }}>
          Supprimer définitivement
        </Button>
      ),
    });
  };

  const handleDuplicate = async (sample) => {
    try {
      const duplicatedSample = {
        title: `${sample.title} (Copie)`,
        block_type: sample.block_type,
        layout: sample.layout,
        content: sample.content || {},
      };

      const { error } = await supabase
        .from('block_samples')
        .insert([duplicatedSample]);

      if (error) throw error;

      toast({ 
        title: "Succès", 
        description: `Le modèle "${sample.title}" a été dupliqué.` 
      });
      fetchSamples();
    } catch (err) {
      console.error('Duplicate failed:', err);
      toast({ 
        title: "Erreur", 
        description: err.message || "Impossible de dupliquer le modèle. Veuillez réessayer.", 
        variant: "destructive" 
      });
    }
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedSamples(new Set(samples.map(sample => sample.id)));
    } else {
      setSelectedSamples(new Set());
    }
  };

  const handleSelectSample = (sampleId, checked) => {
    const newSelected = new Set(selectedSamples);
    if (checked) {
      newSelected.add(sampleId);
    } else {
      newSelected.delete(sampleId);
    }
    setSelectedSamples(newSelected);
    setSelectAll(newSelected.size === samples.length && samples.length > 0);
  };

  // Fetch samples on mount and when filters change
  useEffect(() => {
    (async () => {
      await seedBuiltinSamplesIfNeeded();
      await fetchSamples();
    })();
  }, [seedBuiltinSamplesIfNeeded, fetchSamples]);

  // Update selectAll state when samples change
  useEffect(() => {
    if (samples.length === 0) {
      setSelectAll(false);
      setSelectedSamples(new Set());
    } else {
      setSelectAll(selectedSamples.size === samples.length);
    }
  }, [samples, selectedSamples]);

  // Re-open editor if URL indicates editing=true & sampleId (robust against remounts and tab switches)
  useEffect(() => {
    const urlEditing = searchParams.get('editing') === 'true';
    const urlSampleId = searchParams.get('sampleId');
    if (urlEditing && urlSampleId) {
      const currentId = editingSample?.id ? String(editingSample.id) : null;
      if (!isEditOpen || currentId !== String(urlSampleId)) {
        const local = samples.find(s => String(s.id) === String(urlSampleId));
        if (local) {
          handleEdit(local);
        } else {
          // Fallback: fetch the sample if not in current list yet
          (async () => {
            try {
              const { data, error } = await supabase
                .from('block_samples')
                .select('*')
                .eq('id', urlSampleId)
                .single();
              if (!error && data) {
                handleEdit(data);
              }
            } catch (_) {}
          })();
        }
      }
    }
  }, [searchParams, samples]);

  // Fallback: if URL doesn't have editing flag, restore editor state from sessionStorage (within 1 hour)
  useEffect(() => {
    const urlEditing = searchParams.get('editing') === 'true';
    if (urlEditing) return; // URL takes precedence
    try {
      const raw = sessionStorage.getItem('blockSamplesEditor');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.open) return;
      if (Date.now() - (parsed.timestamp || 0) > 3600000) return; // 1h expiry
      const sid = parsed.sampleId;
      if (!sid) return;
      const local = samples.find(s => String(s.id) === String(sid));
      if (local) {
        handleEdit(local);
      } else {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('block_samples')
              .select('*')
              .eq('id', sid)
              .single();
            if (!error && data) {
              handleEdit(data);
            }
          } catch (_) {}
        })();
      }
    } catch (_) {}
  }, [samples]);

  const handleUseTemplate = async (sample) => {
    console.log('handleUseTemplate called with:', sample);
    try {
      // Ensure all content properties are preserved, including new background color fields
      const sampleContent = sample.content || {};
      const blockData = {
        title: `${sample.title} (Copie)`,
        content: {
          ...sampleContent,
          // Ensure background color properties are included
          backgroundColor: sampleContent.backgroundColor || '',
          useDefaultBackground: sampleContent.useDefaultBackground !== false,
        },
        status: 'draft',
        type: 'hero',
        block_type: sample.block_type,
        layout: sample.layout,
        order_index: 0,
        priority: 0,
      };
      console.log('blockData prepared:', blockData);

      // Déterminer un order_index unique GLOBAL (éviter la contrainte content_blocks_order_index_unique_active)
      try {
        const { data: rows, error: maxErr } = await supabase
          .from('content_blocks')
          .select('order_index')
          .neq('status', 'archived')
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
          // Notify parent to switch to list and open the editor for this new block
          try { onBlockCreated?.(data?.id); } catch (_) {}
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
    // Set state immediately to prevent any race conditions
    setEditingSample(sample);
    setIsEditOpen(true);

    // Populate form with sample data
    const c = sample?.content || {};
    // Determine default title override for "Gallerie 'Full screen' design" (handle common variants)
    const normalizedSampleTitle = (sample?.title || '').trim().toLowerCase();
    const isGalleryFullscreenDesign =
      normalizedSampleTitle === 'gallerie "full screen" design' ||
      normalizedSampleTitle === 'galerie "full screen" design' ||
      ((normalizedSampleTitle.includes('gallerie') || normalizedSampleTitle.includes('galerie')) &&
        normalizedSampleTitle.includes('full screen') &&
        normalizedSampleTitle.includes('design'));
    const effectiveTitle = isGalleryFullscreenDesign ? 'Gallerie fullscreen' : (sample?.title || '');
    setForm({
      title: effectiveTitle,
      badgeText: c.badgeText || 'Votre Espace Privilégié',
      badgeIcon: c.badgeIcon || 'Sparkles',
      titleText: c.title || 'Installez-vous confortablement dans votre espace de formation',
      descriptionText: c.description || "J'ai mis le paquet sur votre espace personnel. Contrairement à d'autres plateformes, ici, tout est pensé pour être une extension de votre propre espace de travail. C'est un lieu pour apprendre, expérimenter et interagir, sans jamais vous sentir perdu.",
      imageUrl: c.imageUrl || 'https://images.unsplash.com/photo-1590177600178-c2597bd63ea7',
      imageAlt: c.imageAlt || "Un espace de travail moderne et confortable avec un ordinateur portable ouvert sur une application de formation",
      showBadge: c.showBadge !== false,
      ctaText: c.ctaText || 'Découvrir maintenant',
      ctaUrl: c.ctaUrl || '#',
      showCta: c.showCta || false,
      backgroundColor: c.backgroundColor || '',
      useDefaultBackground: c.useDefaultBackground !== false,
      contentJsonText: JSON.stringify(c, null, 2),
      // Systems showcase fields
      ss_title: c.title || '',
      ss_titleSuffix: c.titleSuffix || 'rodé',
      ss_images: Array.isArray(c.images) ? c.images : [
        'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/4b9378a927cc2b60cd474d6d2e76f8e6.png',
        'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/efa638b85ff0afb61bd0d102973a387b.png',
        'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/4a8d451b030981196eee43f1b1179dd0.png'
      ],
      ss_buttonText: c.buttonText || 'Faites un tour du propriétaire',
      ss_buttonLink: c.buttonLink || '/mes-systemes',
      // Personal quote fields
      pq_quoteText: c.quoteText || (c.quoteLine1 && c.quoteLine2 ? c.quoteLine1 + " " + c.quoteLine2 : "Cela fait une quinzaine d'années que je teste ce type d'outils — c'est mon métier. Mais depuis six ans, pas une seconde l'envie de quitter Notion. Aujourd'hui, je me lance, j'aimerais vous le présenter ✨✨✨"),
      pq_showCta: c.showCta || false,
      pq_ctaText: c.ctaText || "En savoir plus",
      pq_ctaUrl: c.ctaUrl || "#",
      pq_backgroundColor: c.backgroundColor || "",
      pq_useDefaultBackground: c.useDefaultBackground !== false,
      // Promise section fields
      pr_title: c.title || 'Ma promesse,',
      pr_titleSuffix: c.titleSuffix || 'simple.',
      pr_items: Array.isArray(c.items) ? c.items : [
        { icon: 'Users', title: 'La passion avant-tout', text: "Je suis juste un passionné de systèmes, et un passionné de Notion. je suis bon pédagogue, et j'ai faim de vous apprendre! " },
        { icon: 'CalendarDays', title: 'Premier rendez-vous gratuit', text: "Lancez-vous : aujourd'hui je suis seul, demain l'équipe grandit — mon envie ? Vous former. Le labo est prêt à acceuillir des modérateurs et d'autres experts Notion comme moi. " },
        { icon: 'Zap', title: 'Support Notion éclair ⚡', text: "Décrivez votre souci, je réponds dans la journée.  Assignéez votre demande à un ticket, un message ou même au forum! Vous aurez de quoi venir les réponses! " },
      ],
      pr_showCta: c.showCta || false,
      pr_ctaText: c.ctaText || "Découvrir maintenant",
      pr_ctaUrl: c.ctaUrl || "#",
      pr_backgroundColor: c.backgroundColor || "",
      pr_useDefaultBackground: c.useDefaultBackground !== false,
      pr_backgroundImage: c.backgroundImage || "",
      pr_useBackgroundImage: c.useBackgroundImage || false,
      pr_backgroundOpacity: c.backgroundOpacity || 0.5,
      // launch_cta fields
      lcta_displayDate: c.displayDate || '1 septembre 2025',
      lcta_heading: c.heading || "Je démarre mon activité et j'ai faim de vous présenter mon outil !",
      lcta_subText: c.subText || "Alors s'il vous plaît, n'hésitez pas, faites quelques heures de formation, contactez-moi !",
      lcta_buttonText: c.buttonText || 'Contactez-moi !',
      lcta_buttonLink: c.buttonLink || '/contact',
      lcta_showCta: c.showCta !== false,
      lcta_iconName: c.iconName || 'Heart',
      lcta_useDefaultBackground: c.useDefaultBackground !== false,
      lcta_backgroundColor: c.backgroundColor || '',
      lcta_backgroundGradient: c.backgroundGradient || 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
      lcta_useDefaultGradient: c.useDefaultGradient !== false,
      lcta_bgMode: (c.useDefaultBackground === false && c.useDefaultGradient === false && c.backgroundGradient) ? 'gradient' : 'color',
      lcta_gradStart: '#ff6b35',
      lcta_gradEnd: '#f7931e',
      lcta_gradAngle: 135,
    });

    // Persist editor state (sessionStorage) so a remount or tab switch restores it
    try {
      if (sample?.id) {
        sessionStorage.setItem('blockSamplesEditor', JSON.stringify({
          open: true,
          sampleId: String(sample.id),
          timestamp: Date.now(),
        }));
      }
    } catch (e) {
      // ignore storage errors
    }

    // Sync URL after state is set to avoid race conditions
    setTimeout(() => {
      try {
        const sp = new URLSearchParams(searchParams);
        sp.set('subtab', 'samples');
        sp.set('editing', 'true');
        sp.set('sampleId', String(sample.id));
        setSearchParams(sp, { replace: true });
      } catch (e) {
        // ignore URL sync errors
      }
    }, 0);
  };

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleImageChange = (url) => {
    setForm(prev => ({ ...prev, imageUrl: url }));
  };

  const getPreviewContent = () => {
    const layout = editingSample?.layout || 'home.cozy_space';
    if (layout === 'home.cozy_space') {
      return {
        badgeText: form.badgeText,
        badgeIcon: form.badgeIcon,
        title: form.titleText,
        description: form.descriptionText,
        imageUrl: form.imageUrl,
        imageAlt: form.imageAlt,
        showBadge: form.showBadge,
        ctaText: form.ctaText,
        ctaUrl: form.ctaUrl,
        showCta: form.showCta,
        backgroundColor: form.backgroundColor,
        useDefaultBackground: form.useDefaultBackground,
      };
    }
    if (layout === 'home.launch_cta') {
      return {
        displayDate: form.lcta_displayDate,
        heading: form.lcta_heading,
        subText: form.lcta_subText,
        buttonText: form.lcta_buttonText,
        buttonLink: form.lcta_buttonLink,
        showCta: form.lcta_showCta,
        iconName: form.lcta_iconName,
        useDefaultBackground: form.lcta_useDefaultBackground,
        backgroundColor: form.lcta_backgroundColor,
        backgroundGradient: form.lcta_backgroundGradient,
        useDefaultGradient: form.lcta_useDefaultGradient,
      };
    }
    if (layout === 'home.systems_showcase') {
      return {
        title: form.ss_title,
        titleSuffix: form.ss_titleSuffix,
        images: form.ss_images.filter(img => img.trim() !== ''),
        buttonText: form.ss_buttonText,
        buttonLink: form.ss_buttonLink,
      };
    }
    if (layout === 'home.personal_quote') {
      return {
        quoteText: form.pq_quoteText,
        showCta: form.pq_showCta,
        ctaText: form.pq_ctaText,
        ctaUrl: form.pq_ctaUrl,
        backgroundColor: form.pq_backgroundColor,
        useDefaultBackground: form.pq_useDefaultBackground,
      };
    }
    if (layout === 'home.main_hero') {
      return {
        imageUrl: form.mh_imageUrl,
        overlayOpacity: form.mh_overlayOpacity,
      };
    }
    if (layout === 'home.promise') {
      return {
        pr_title: form.pr_title,
        pr_titleSuffix: form.pr_titleSuffix,
        pr_items: form.pr_items,
        pr_showCta: form.pr_showCta,
        pr_ctaText: form.pr_ctaText,
        pr_ctaUrl: form.pr_ctaUrl,
        pr_backgroundColor: form.pr_backgroundColor,
        pr_useDefaultBackground: form.pr_useDefaultBackground,
        pr_backgroundImage: form.pr_backgroundImage,
        pr_useBackgroundImage: form.pr_useBackgroundImage,
        pr_backgroundOpacity: form.pr_backgroundOpacity,
      };
    }
    try {
      return JSON.parse(form.contentJsonText || '{}');
    } catch (e) {
      return {};
    }
  };

  const renderPreviewForCurrent = () => {
    const layout = editingSample?.layout || 'home.cozy_space';
    switch (layout) {
      case 'home.main_hero':
        return <MainHeroSection content={getPreviewContent()} />;
      case 'home.systems_showcase':
        return <SystemsShowcase content={getPreviewContent()} />;
      case 'home.stats':
        return <StatsSection content={getPreviewContent()} />;
      case 'home.formations':
        return <FormationsSection content={getPreviewContent()} />;
      case 'home.support':
        return <SupportSection content={getPreviewContent()} />;
      case 'home.promise':
        return <PromiseSection content={getPreviewContent()} />;
      case 'home.cozy_space':
        return (
          <CozySpaceSectionWithUpload
            content={getPreviewContent()}
            previewMode={previewMode}
            onImageChange={handleImageChange}
          />
        );
      case 'home.personal_quote':
        return <PersonalQuoteSection content={getPreviewContent()} />;
      case 'home.final_cta':
        return <FinalCTA content={getPreviewContent()} />;
      case 'home.launch_cta':
        return <LaunchCTA content={getPreviewContent()} />;
      case 'global.footer':
        return <Footer isPreview={true} content={getPreviewContent()} />;
      default:
        return (
          <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">{JSON.stringify(getPreviewContent(), null, 2)}</pre>
        );
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const layout = editingSample?.layout || 'home.cozy_space';
      let contentPayload = {};

      if (layout === 'home.cozy_space') {
        contentPayload = {
          badgeText: form.badgeText,
          badgeIcon: form.badgeIcon,
          title: form.titleText,
          description: form.descriptionText,
          imageUrl: form.imageUrl,
          imageAlt: form.imageAlt,
          showBadge: form.showBadge,
          ctaText: form.ctaText,
          ctaUrl: form.ctaUrl,
          showCta: form.showCta,
          backgroundColor: form.backgroundColor,
          useDefaultBackground: form.useDefaultBackground,
        };
      } else if (layout === 'home.systems_showcase') {
        contentPayload = {
          title: form.ss_title,
          titleSuffix: form.ss_titleSuffix,
          images: form.ss_images.filter(img => img.trim() !== ''),
          buttonText: form.ss_buttonText,
          buttonLink: form.ss_buttonLink,
        };
      } else if (layout === 'home.personal_quote') {
        contentPayload = {
          quoteText: form.pq_quoteText,
          showCta: form.pq_showCta,
          ctaText: form.pq_ctaText,
          ctaUrl: form.pq_ctaUrl,
          backgroundColor: form.pq_backgroundColor,
          useDefaultBackground: form.pq_useDefaultBackground,
        };
      } else if (layout === 'home.main_hero') {
        contentPayload = {
          imageUrl: form.mh_imageUrl,
          overlayOpacity: form.mh_overlayOpacity,
        };
      } else if (layout === 'home.promise') {
        contentPayload = {
          title: form.pr_title,
          titleSuffix: form.pr_titleSuffix,
          items: form.pr_items,
          showCta: form.pr_showCta,
          ctaText: form.pr_ctaText,
          ctaUrl: form.pr_ctaUrl,
          backgroundColor: form.pr_backgroundColor,
          useDefaultBackground: form.pr_useDefaultBackground,
          backgroundImage: form.pr_backgroundImage,
          useBackgroundImage: form.pr_useBackgroundImage,
          backgroundOpacity: form.pr_backgroundOpacity,
        };
      } else if (layout === 'home.launch_cta') {
        contentPayload = {
          displayDate: form.lcta_displayDate,
          heading: form.lcta_heading,
          subText: form.lcta_subText,
          buttonText: form.lcta_buttonText,
          buttonLink: form.lcta_buttonLink,
          showCta: form.lcta_showCta,
          iconName: form.lcta_iconName,
          useDefaultBackground: form.lcta_useDefaultBackground,
          backgroundColor: form.lcta_backgroundColor,
          backgroundGradient: form.lcta_backgroundGradient,
          useDefaultGradient: form.lcta_useDefaultGradient,
        };
      } else {
        try {
          contentPayload = JSON.parse(form.contentJsonText || '{}');
        } catch(e) {
          contentPayload = {};
        }
      }

      const payload = {
        title: form.title,
        block_type: editingSample?.block_type || 'dynamic',
        layout: layout,
        content: contentPayload,
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
      
      // Clear URL params and localStorage when explicitly closing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('editing');
      newSearchParams.delete('sampleId');
      setSearchParams(newSearchParams, { replace: true });
      
      setIsEditOpen(false);
      setEditingSample(null);
      try { sessionStorage.removeItem('blockSamplesEditor'); } catch (_) {}
      fetchSamples();
    } catch (err) {
      toast({ title: 'Erreur', description: `Impossible d'enregistrer le modèle: ${err.message}`, variant: 'destructive' });
    }
  };


  // Sync URL params with editor state
  // Important: do NOT drop editing/sampleId when isEditOpen is false.
  // We only set params when opening; we clear them explicitly on Save/Cancel.
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    const urlEditing = searchParams.get('editing') === 'true';
    const urlSampleId = searchParams.get('sampleId');

    if (isEditOpen) {
      // Ensure editing flag and keep subtab on samples
      newSearchParams.set('editing', 'true');
      newSearchParams.set('subtab', 'samples');
      if (editingSample?.id) {
        newSearchParams.set('sampleId', editingSample.id.toString());
      } else if (urlSampleId) {
        // Preserve existing sampleId until we resolve the sample object
        newSearchParams.set('sampleId', urlSampleId);
      }
    } else {
      // When closed, leave URL as-is. Explicit close handlers will clean params.
    }

    const currentParams = searchParams.toString();
    const newParams = newSearchParams.toString();
    if (currentParams !== newParams) {
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [isEditOpen, editingSample, searchParams, setSearchParams]);





  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-xl font-semibold">Bibliothèque de modèles de Blocs</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importFromActiveBlocks}>
            <Layers className="h-4 w-4 mr-2" />
            Importer depuis Blocs Actifs
          </Button>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="relative flex-grow">
            <Label htmlFor="search-input" className="block text-sm font-medium mb-2">Rechercher un modèle</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Rechercher un modèle..."
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <Label htmlFor="layout-filter" className="block text-sm font-medium mb-2">Filtrer par layout</Label>
            <Select value={layoutFilter} onValueChange={setLayoutFilter}>
              <SelectTrigger id="layout-filter">
                <SelectValue placeholder="Tous les layouts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="home.cozy_space">home.cozy_space</SelectItem>
                <SelectItem value="home.main_hero">home.main_hero</SelectItem>
                <SelectItem value="home.systems_showcase">home.systems_showcase</SelectItem>
                <SelectItem value="home.stats">home.stats</SelectItem>
                <SelectItem value="home.support">home.support</SelectItem>
                <SelectItem value="home.promise">home.promise</SelectItem>
                <SelectItem value="home.personal_quote">home.personal_quote</SelectItem>
                <SelectItem value="home.final_cta">home.final_cta</SelectItem>
                <SelectItem value="home.launch_cta">home.launch_cta</SelectItem>
                <SelectItem value="global.footer">global.footer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-green-50 dark:bg-green-900/20">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner tout"
                />
              </TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-red-500"><AlertCircle className="mx-auto h-6 w-6 mb-2" />{error}</TableCell></TableRow>
            ) : samples.length > 0 ? (
              samples.map(sample => (
                <TableRow key={sample.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedSamples.has(sample.id)}
                      onCheckedChange={(checked) => handleSelectSample(sample.id, checked)}
                      aria-label={`Sélectionner ${sample.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{sample.title}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{sample.layout}</span>
                  </TableCell>
                  <TableCell>
                     <Badge variant={sample.block_type === 'dynamic' ? 'outline' : 'default'} className="flex items-center gap-1 w-fit">
                      {sample.block_type === 'dynamic' ? <Layers className="h-3 w-3" /> : <Code className="h-3 w-3" />}
                      {sample.block_type}
                    </Badge>
                  </TableCell>
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
                        <DropdownMenuItem onClick={() => handleDuplicate(sample)}>
                            <Copy className="mr-2 h-4 w-4" />
                            <span>Dupliquer</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleDelete(sample.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Supprimer</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">Aucun modèle de bloc trouvé. Créez-en un pour commencer !</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-[95vw] w-full h-[95vh] max-h-[95vh]"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Éditer le modèle: {form.title || editingSample?.title}</DialogTitle>
          </DialogHeader>
          {
          <div className="flex h-full gap-6 overflow-hidden">
            <div className="w-[26rem] flex-shrink-0 space-y-4 overflow-y-auto pr-2">
              <div>
                <Label>Titre du modèle</Label>
                <Input value={form.title} onChange={handleChange('title')} />
              </div>
              {editingSample?.layout === 'home.personal_quote' && (
                <div className="space-y-4">
                  <div>
                    <Label>Citation personnelle</Label>
                    <Textarea 
                      value={form.pq_quoteText || ''} 
                      onChange={(e) => setForm(prev => ({ ...prev, pq_quoteText: e.target.value }))} 
                      placeholder="Cela fait une quinzaine d'années que je teste ce type d'outils — c'est mon métier. Mais depuis six ans, pas une seconde l'envie de quitter Notion. Aujourd'hui, je me lance, j'aimerais vous le présenter ✨✨✨"
                      rows={6}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="pq-show-cta" 
                        checked={form.pq_showCta} 
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, pq_showCta: checked }))} 
                      />
                      <Label htmlFor="pq-show-cta">Afficher un bouton Call-to-Action</Label>
                    </div>
                    
                    {form.pq_showCta && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="mainTitle">Titre complet</Label>
                          <Input
                            id="mainTitle"
                            value={form.mainTitle || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, mainTitle: e.target.value }))}
                            placeholder="Titre complet (utilisez ** pour mettre en couleur, ex: Notre **promesse**)"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Utilisez **texte** pour mettre une partie du titre en couleur
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="pq-use-default-bg" 
                        checked={form.pq_useDefaultBackground} 
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, pq_useDefaultBackground: checked }))} 
                      />
                      <Label htmlFor="pq-use-default-bg">Utiliser la couleur de fond par défaut (noir)</Label>
                    </div>
                    
                    {!form.pq_useDefaultBackground && (
                      <div className="pl-6 border-l-2 border-muted">
                        <Label>Couleur de fond personnalisée</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            type="color"
                            value={form.pq_backgroundColor || '#000000'} 
                            onChange={(e) => setForm(prev => ({ ...prev, pq_backgroundColor: e.target.value }))} 
                            className="w-16 h-10 p-1 border rounded"
                          />
                          <Input 
                            value={form.pq_backgroundColor || ''} 
                            onChange={(e) => setForm(prev => ({ ...prev, pq_backgroundColor: e.target.value }))} 
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {editingSample?.layout === 'home.main_hero' && (
                <div className="space-y-4">
                  <div>
                    <Label>Image de fond full screen</Label>
                    <ImageUpload
                      currentImageUrl={form.mh_imageUrl}
                      onImageChange={(url) => setForm(prev => ({ ...prev, mh_imageUrl: url }))}
                      acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
                      compact={true}
                    />
                  </div>

                  <div>
                    <Label>Opacité de l'overlay (0 = transparent, 1 = opaque)</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={form.mh_overlayOpacity || 0.3}
                        onChange={(e) => setForm(prev => ({ ...prev, mh_overlayOpacity: parseFloat(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">{(form.mh_overlayOpacity || 0.3).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
              {editingSample?.layout === 'home.promise' && (
                <div className="space-y-4">
                  <div>
                    <Label>Titre complet</Label>
                    <Input 
                      value={form.pr_title || ''} 
                      onChange={(e) => setForm(prev => ({ ...prev, pr_title: e.target.value }))} 
                      placeholder="Ma **promesse**, simple. (utilisez ** pour la couleur)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Utilisez **texte** pour mettre une partie du titre en couleur
                    </p>
                  </div>

                  <div>
                    <Label>Colonnes de promesses</Label>
                    <div className="space-y-3">
                      {(form.pr_items || []).map((item, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-muted/30">
                          <div className="flex gap-2 items-center mb-2">
                            <div className="flex-1">
                              <Label className="text-xs">Titre</Label>
                              <Input
                                value={item.title || ''}
                                onChange={(e) => {
                                  const newItems = [...form.pr_items];
                                  newItems[index] = { ...newItems[index], title: e.target.value };
                                  setForm(prev => ({ ...prev, pr_items: newItems }));
                                }}
                                placeholder="Titre de la promesse"
                                className="mt-1"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newItems = form.pr_items.filter((_, i) => i !== index);
                                setForm(prev => ({ ...prev, pr_items: newItems }));
                              }}
                              className="text-red-600 hover:text-red-700 self-end"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Icône</Label>
                              <div className="flex gap-2 mt-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowPromiseIcons(showPromiseIcons === index ? null : index)}
                                  className="flex items-center gap-2"
                                >
                                  {(() => {
                                    const IconComponent = promiseIcons.find(icon => icon.name === item.icon)?.icon || Users;
                                    return <IconComponent className="h-4 w-4" />;
                                  })()}
                                  {promiseIcons.find(icon => icon.name === item.icon)?.label || 'Choisir'}
                                </Button>
                              </div>
                              {showPromiseIcons === index && (
                                <div className="grid grid-cols-4 gap-2 mt-2 p-3 border rounded-lg bg-background">
                                  {promiseIcons.map((iconItem) => {
                                    const IconComponent = iconItem.icon;
                                    return (
                                      <Button
                                        key={iconItem.name}
                                        type="button"
                                        variant={item.icon === iconItem.name ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                          const newItems = [...form.pr_items];
                                          newItems[index] = { ...newItems[index], icon: iconItem.name };
                                          setForm(prev => ({ ...prev, pr_items: newItems }));
                                          setShowPromiseIcons(null);
                                        }}
                                        className="flex flex-col items-center gap-1 h-auto py-2"
                                      >
                                        <IconComponent className="h-4 w-4" />
                                        <span className="text-xs">{iconItem.label}</span>
                                      </Button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs">Description</Label>
                              <Textarea 
                                value={item.description || ''} 
                                onChange={(e) => {
                                  const newItems = [...form.pr_items];
                                  newItems[index] = { ...newItems[index], description: e.target.value };
                                  setForm(prev => ({ ...prev, pr_items: newItems }));
                                }}
                                placeholder="Description de la promesse"
                                rows={2}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newItems = [...(form.pr_items || []), { icon: 'Users', title: '', text: '' }];
                          setForm(prev => ({ ...prev, pr_items: newItems }));
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une colonne
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="pr-show-cta" 
                        checked={form.pr_showCta} 
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, pr_showCta: checked }))} 
                      />
                      <Label htmlFor="pr-show-cta">Afficher un bouton Call-to-Action</Label>
                    </div>
                    
                    {form.pr_showCta && (
                      <div className="space-y-3 pl-6 border-l-2 border-muted">
                        <div>
                          <Label>Texte du bouton</Label>
                          <Input 
                            value={form.pr_ctaText || ''} 
                            onChange={(e) => setForm(prev => ({ ...prev, pr_ctaText: e.target.value }))} 
                            placeholder="Découvrir maintenant"
                          />
                        </div>
                        <div>
                          <Label>Lien du bouton</Label>
                          <Input 
                            value={form.pr_ctaUrl || ''} 
                            onChange={(e) => setForm(prev => ({ ...prev, pr_ctaUrl: e.target.value }))} 
                            placeholder="#"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="pr-use-bg-image" 
                        checked={form.pr_useBackgroundImage} 
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, pr_useBackgroundImage: checked }))} 
                      />
                      <Label htmlFor="pr-use-bg-image">Utiliser une image de fond</Label>
                    </div>
                    
                    {form.pr_useBackgroundImage ? (
                      <div className="space-y-3 pl-6 border-l-2 border-muted">
                        <div>
                          <Label>Image de fond</Label>
                          <ImageUpload
                            currentImageUrl={form.pr_backgroundImage}
                            onImageSelected={(url) => setForm(prev => ({ ...prev, pr_backgroundImage: url }))}
                            bucketName="block-images"
                            cropAspectRatio={16/9}
                            maxSizeMB={5}
                            compact={true}
                          />
                        </div>
                        <div>
                          <Label>Opacité de l'image (0 = transparent, 1 = opaque)</Label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={form.pr_backgroundOpacity || 0.5}
                              onChange={(e) => setForm(prev => ({ ...prev, pr_backgroundOpacity: parseFloat(e.target.value) }))}
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground w-12">{(form.pr_backgroundOpacity || 0.5).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 pl-6 border-l-2 border-muted">
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="pr-use-default-bg" 
                            checked={form.pr_useDefaultBackground} 
                            onCheckedChange={(checked) => setForm(prev => ({ ...prev, pr_useDefaultBackground: checked }))} 
                          />
                          <Label htmlFor="pr-use-default-bg">Utiliser la couleur de fond par défaut (transparent)</Label>
                        </div>
                        
                        {!form.pr_useDefaultBackground && (
                          <div>
                            <Label>Couleur de fond personnalisée</Label>
                            <div className="flex gap-2 mt-1">
                              <Input 
                                type="color"
                                value={form.pr_backgroundColor || '#ffffff'} 
                                onChange={(e) => setForm(prev => ({ ...prev, pr_backgroundColor: e.target.value }))} 
                                className="w-16 h-10 p-1 border rounded"
                              />
                              <Input 
                                value={form.pr_backgroundColor || ''} 
                                onChange={(e) => setForm(prev => ({ ...prev, pr_backgroundColor: e.target.value }))} 
                                placeholder="#ffffff"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {editingSample?.layout === 'home.systems_showcase' && (
                <div className="space-y-4">
                  <div>
                    <Label>Titre</Label>
                    <Input 
                      value={form.ss_title || ''} 
                      onChange={(e) => setForm(prev => ({ ...prev, ss_title: e.target.value }))} 
                      placeholder="Un système rodé"
                    />
                  </div>
                  <div>
                    <Label>Images du carrousel (1-4 images)</Label>
                    <div className="space-y-3">
                      {(form.ss_images || []).map((image, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-muted/30">
                          <div className="flex gap-2 items-start mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Image {index + 1}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newImages = (form.ss_images || []).filter((_, i) => i !== index);
                                setForm(prev => ({ ...prev, ss_images: newImages }));
                              }}
                              className="text-red-600 hover:text-red-700 ml-auto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <ImageUpload
                              currentImageUrl={image}
                              onImageSelected={(url) => {
                                const newImages = [...(form.ss_images || [])];
                                newImages[index] = url;
                                setForm(prev => ({ ...prev, ss_images: newImages }));
                              }}
                              bucketName="block-images"
                              cropAspectRatio={16/9}
                              maxSizeMB={5}
                              compact={true}
                            />
                          </div>
                        </div>
                      ))}
                      {(!form.ss_images || form.ss_images.length < 4) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newImages = [...(form.ss_images || []), ''];
                            setForm(prev => ({ ...prev, ss_images: newImages }));
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter une image
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Ajoutez entre 1 et 4 images pour le carrousel via l'upload de fichiers.</p>
                  </div>
                  <div>
                    <Label>Texte du bouton</Label>
                    <Input 
                      value={form.ss_buttonText || ''} 
                      onChange={(e) => setForm(prev => ({ ...prev, ss_buttonText: e.target.value }))} 
                      placeholder="Faites un tour du propriétaire"
                    />
                  </div>
                  <div>
                    <Label>Lien du bouton</Label>
                    <Input 
                      value={form.ss_buttonLink || ''} 
                      onChange={(e) => setForm(prev => ({ ...prev, ss_buttonLink: e.target.value }))} 
                      placeholder="/mes-systemes"
                    />
                  </div>
                </div>
              )}
              {editingSample?.layout === 'home.launch_cta' && (
                <div className="space-y-4">
                  {/* Menu 1: Contenu principal */}
                  <Collapsible defaultOpen={true}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Contenu principal
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/20">
                      <div>
                        <Label>Titre du modèle</Label>
                        <Input 
                          value={form.title} 
                          onChange={handleChange('title')} 
                          placeholder="Nom du modèle"
                        />
                      </div>

                      <div>
                        <Label>Pictogramme</Label>
                        <div className="flex gap-2 items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBadgeIcons(!showBadgeIcons)}
                            className="flex items-center gap-2"
                          >
                            {(() => {
                              const IconComponent = promiseIcons.find(icon => icon.name === form.lcta_iconName)?.icon || Heart;
                              return <IconComponent className="h-4 w-4" />;
                            })()}
                            {promiseIcons.find(icon => icon.name === form.lcta_iconName)?.label || 'Choisir'}
                          </Button>
                        </div>
                        {showBadgeIcons && (
                          <div className="grid grid-cols-4 gap-2 mt-2 p-3 border rounded-lg bg-background">
                            {promiseIcons.map((iconItem) => {
                              const IconComponent = iconItem.icon;
                              return (
                                <Button
                                  key={iconItem.name}
                                  type="button"
                                  variant={form.lcta_iconName === iconItem.name ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setForm(prev => ({ ...prev, lcta_iconName: iconItem.name }));
                                    setShowBadgeIcons(false);
                                  }}
                                  className="flex flex-col items-center gap-1 h-auto py-2"
                                >
                                  <IconComponent className="h-4 w-4" />
                                  <span className="text-xs">{iconItem.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Petite introduction</Label>
                        <Input 
                          value={form.lcta_displayDate || ''} 
                          onChange={(e) => setForm(prev => ({ ...prev, lcta_displayDate: e.target.value }))} 
                          placeholder="1 septembre 2025"
                        />
                      </div>

                      <div>
                        <Label>Texte principal</Label>
                        <Textarea 
                          value={form.lcta_heading || ''} 
                          onChange={(e) => setForm(prev => ({ ...prev, lcta_heading: e.target.value }))} 
                          placeholder="Je démarre mon activité et j'ai faim de vous présenter mon outil !"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Texte secondaire</Label>
                        <Textarea 
                          value={form.lcta_subText || ''} 
                          onChange={(e) => setForm(prev => ({ ...prev, lcta_subText: e.target.value }))} 
                          placeholder="Alors s'il vous plaît, n'hésitez pas, faites quelques heures de formation, contactez-moi !"
                          rows={3}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Menu 2: Bouton Call-to-Action */}
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Bouton Call-to-Action
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/20">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="lcta-show-cta" 
                          checked={form.lcta_showCta} 
                          onCheckedChange={(checked) => setForm(prev => ({ ...prev, lcta_showCta: checked }))} 
                        />
                        <Label htmlFor="lcta-show-cta">Afficher le bouton Call-to-Action</Label>
                      </div>
                      
                      {form.lcta_showCta && (
                        <div className="space-y-3 pl-6 border-l-2 border-muted">
                          <div>
                            <Label>Texte du bouton</Label>
                            <Input 
                              value={form.lcta_buttonText || ''} 
                              onChange={(e) => setForm(prev => ({ ...prev, lcta_buttonText: e.target.value }))} 
                              placeholder="Contactez-moi !"
                            />
                          </div>
                          <div>
                            <Label>Lien du bouton</Label>
                            <Input 
                              value={form.lcta_buttonLink || ''} 
                              onChange={(e) => setForm(prev => ({ ...prev, lcta_buttonLink: e.target.value }))} 
                              placeholder="/contact"
                            />
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Menu 3: Arrière-plan */}
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Arrière-plan
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/20">
                      {/* 1) Toggle default background vs custom */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="lcta-use-default-bg">Utiliser l'arrière-plan par défaut</Label>
                        <Switch
                          id="lcta-use-default-bg"
                          checked={form.lcta_useDefaultBackground}
                          onCheckedChange={(checked) => setForm(prev => ({ ...prev, lcta_useDefaultBackground: checked }))}
                        />
                      </div>

                      {/* 2) Custom background editor */}
                      {!form.lcta_useDefaultBackground && (
                        <div className="space-y-4 pl-6 border-l-2 border-muted">
                          {/* Mode selector */}
                          <div>
                            <Label>Mode d'arrière-plan</Label>
                            <div className="flex gap-2 mt-2">
                              <Button
                                type="button"
                                variant={form.lcta_bgMode === 'color' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setForm(prev => ({
                                  ...prev,
                                  lcta_bgMode: 'color',
                                  lcta_useDefaultGradient: true,
                                }))}
                              >
                                Couleur unie
                              </Button>
                              <Button
                                type="button"
                                variant={form.lcta_bgMode === 'gradient' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setForm(prev => ({
                                  ...prev,
                                  lcta_bgMode: 'gradient',
                                  lcta_useDefaultGradient: false,
                                  lcta_backgroundGradient: prev.lcta_backgroundGradient || `linear-gradient(${prev.lcta_gradAngle || 135}deg, ${prev.lcta_gradStart || '#ff6b35'} 0%, ${prev.lcta_gradEnd || '#f7931e'} 100%)`
                                }))}
                              >
                                Dégradé
                              </Button>
                            </div>
                          </div>

                          {/* Color mode */}
                          {form.lcta_bgMode === 'color' && (
                            <div className="space-y-2">
                              <Label>Couleur de fond personnalisée</Label>
                              <div className="flex gap-2 mt-1 items-center">
                                <Input
                                  type="color"
                                  value={form.lcta_backgroundColor || '#ff6b35'}
                                  onChange={(e) => setForm(prev => ({ ...prev, lcta_backgroundColor: e.target.value }))}
                                  className="w-16 h-10 p-1 border rounded"
                                />
                                <Input
                                  value={form.lcta_backgroundColor || ''}
                                  onChange={(e) => setForm(prev => ({ ...prev, lcta_backgroundColor: e.target.value }))}
                                  placeholder="#ff6b35"
                                  className="flex-1"
                                />
                                <div
                                  className="w-10 h-10 rounded border"
                                  style={{ background: form.lcta_backgroundColor || '#ff6b35' }}
                                  aria-label="Aperçu couleur"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">Astuce: une couleur unie produit un dégradé harmonisé automatiquement dans l'aperçu.</p>
                            </div>
                          )}

                          {/* Gradient mode */}
                          {form.lcta_bgMode === 'gradient' && (
                            <div className="space-y-3">
                              <div>
                                <Label>Couleurs du dégradé</Label>
                                <div className="flex gap-3 mt-2 items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-10">Début</span>
                                    <Input type="color" value={form.lcta_gradStart} onChange={(e) => {
                                      const start = e.target.value;
                                      setForm(prev => ({
                                        ...prev,
                                        lcta_gradStart: start,
                                        lcta_useDefaultGradient: false,
                                        lcta_backgroundGradient: `linear-gradient(${prev.lcta_gradAngle}deg, ${start} 0%, ${prev.lcta_gradEnd} 100%)`
                                      }));
                                    }} className="w-12 h-10 p-1 border rounded" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-10">Fin</span>
                                    <Input type="color" value={form.lcta_gradEnd} onChange={(e) => {
                                      const end = e.target.value;
                                      setForm(prev => ({
                                        ...prev,
                                        lcta_gradEnd: end,
                                        lcta_useDefaultGradient: false,
                                        lcta_backgroundGradient: `linear-gradient(${prev.lcta_gradAngle}deg, ${prev.lcta_gradStart} 0%, ${end} 100%)`
                                      }));
                                    }} className="w-12 h-10 p-1 border rounded" />
                                  </div>
                                  <div
                                    className="flex-1 h-10 rounded border"
                                    style={{ background: form.lcta_backgroundGradient || `linear-gradient(${form.lcta_gradAngle}deg, ${form.lcta_gradStart} 0%, ${form.lcta_gradEnd} 100%)` }}
                                    aria-label="Aperçu dégradé"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label>Angle du dégradé: {form.lcta_gradAngle}°</Label>
                                <input
                                  type="range"
                                  min={0}
                                  max={360}
                                  step={1}
                                  value={form.lcta_gradAngle}
                                  onChange={(e) => {
                                    const angle = Number(e.target.value);
                                    setForm(prev => ({
                                      ...prev,
                                      lcta_gradAngle: angle,
                                      lcta_useDefaultGradient: false,
                                      lcta_backgroundGradient: `linear-gradient(${angle}deg, ${prev.lcta_gradStart} 0%, ${prev.lcta_gradEnd} 100%)`
                                    }));
                                  }}
                                  className="w-full"
                                />
                              </div>
                              <div>
                                <Label>Préréglages</Label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                                  {lctaGradientPresets.map(p => (
                                    <button
                                      key={p.name}
                                      type="button"
                                      onClick={() => setForm(prev => ({
                                        ...prev,
                                        lcta_bgMode: 'gradient',
                                        lcta_useDefaultGradient: false,
                                        lcta_gradStart: p.start,
                                        lcta_gradEnd: p.end,
                                        lcta_gradAngle: p.angle,
                                        lcta_backgroundGradient: `linear-gradient(${p.angle}deg, ${p.start} 0%, ${p.end} 100%)`
                                      }))}
                                      className="h-10 rounded border"
                                      title={p.name}
                                      style={{ background: `linear-gradient(${p.angle}deg, ${p.start} 0%, ${p.end} 100%)` }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label>Dégradé CSS (avancé)</Label>
                                <Input
                                  value={form.lcta_backgroundGradient || ''}
                                  onChange={(e) => setForm(prev => ({ ...prev, lcta_backgroundGradient: e.target.value, lcta_useDefaultGradient: false }))}
                                  placeholder="linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Vous pouvez coller un CSS de dégradé ici. Les réglages ci-dessus s'adapteront au prochain changement.</p>
                              </div>
                            </div>
                          )}

                          {/* Reset buttons */}
                          <div className="flex gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setForm(prev => ({
                                ...prev,
                                lcta_useDefaultBackground: true
                              }))}
                            >
                              Revenir au fond par défaut
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setForm(prev => ({
                                ...prev,
                                lcta_bgMode: 'color',
                                lcta_useDefaultGradient: true,
                                lcta_backgroundColor: '#ff6b35',
                                lcta_backgroundGradient: '',
                                lcta_gradStart: '#ff6b35',
                                lcta_gradEnd: '#f7931e',
                                lcta_gradAngle: 135,
                              }))}
                            >
                              Réinitialiser l'éditeur
                            </Button>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
              {editingSample?.layout !== 'home.cozy_space' && editingSample?.layout !== 'home.systems_showcase' && editingSample?.layout !== 'home.personal_quote' && editingSample?.layout !== 'home.promise' && editingSample?.layout !== 'home.main_hero' && editingSample?.layout !== 'home.launch_cta' && (
                <div>
                  <Label>Contenu JSON (avancé)</Label>
                  <Textarea rows={16} value={form.contentJsonText} onChange={handleChange('contentJsonText')} />
                  <p className="text-xs text-muted-foreground mt-1">Modifiez le contenu du layout au format JSON. La prévisualisation à droite reflète les changements.</p>
                </div>
              )}
              {editingSample?.layout === 'home.cozy_space' && (
                <div>
                  <Label>Badge</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input 
                        value={form.badgeText} 
                        onChange={handleChange('badgeText')} 
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBadgeIcons(!showBadgeIcons)}
                        className="px-2 py-1 h-auto"
                        title="Choisir une icône"
                      >
                        {React.createElement(badgeIcons.find(icon => icon.name === form.badgeIcon)?.icon || Sparkles, { 
                          className: "w-4 h-4" 
                        })}
                        {showBadgeIcons ? (
                          <ChevronUp className="w-3 h-3 ml-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-1" />
                        )}
                      </Button>
                    </div>
                    {showBadgeIcons && (
                      <div className="border rounded-md p-3 bg-muted/30">
                        <Label className="text-xs text-muted-foreground mb-2 block">Icône du badge</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {badgeIcons.map((iconItem) => {
                            const IconComponent = iconItem.icon;
                            return (
                              <button
                                key={iconItem.name}
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({ ...prev, badgeIcon: iconItem.name }));
                                  setShowBadgeIcons(false);
                                }}
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
                    )}
                  </div>
                </div>
              )}
              {editingSample?.layout === 'home.cozy_space' && (
                <div>
                  <Label>Afficher le badge</Label>
                  <Switch checked={form.showBadge} onCheckedChange={(v) => setForm(prev => ({ ...prev, showBadge: v }))} />
                </div>
              )}
              {editingSample?.layout === 'home.cozy_space' && (
                <div>
                  <Label>Titre affiché</Label>
                  <Input value={form.titleText} onChange={handleChange('titleText')} />
                </div>
              )}
              {editingSample?.layout === 'home.cozy_space' && (
                <div>
                  <Label>Paragraphe</Label>
                  <Textarea value={form.descriptionText} onChange={handleChange('descriptionText')} rows={6} />
                </div>
              )}
              {editingSample?.layout === 'home.cozy_space' && (
                <div>
                  <Label>Call-to-Action</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Afficher le bouton CTA</Label>
                      <Switch checked={form.showCta} onCheckedChange={(v) => setForm(prev => ({ ...prev, showCta: v }))} />
                    </div>
                    {form.showCta && (
                      <div className="space-y-2">
                        <Input 
                          value={form.ctaText} 
                          onChange={handleChange('ctaText')} 
                          placeholder="Texte du bouton"
                        />
                        <Input 
                          value={form.ctaUrl} 
                          onChange={handleChange('ctaUrl')} 
                          placeholder="URL de destination"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {editingSample?.layout === 'home.cozy_space' && (
                <div>
                  <Label>Couleur de fond</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Utiliser la couleur par défaut</Label>
                      <Switch 
                        checked={form.useDefaultBackground} 
                        onCheckedChange={(v) => setForm(prev => ({ ...prev, useDefaultBackground: v }))} 
                      />
                    </div>
                    {!form.useDefaultBackground && (
                      <div className="flex gap-2 items-center">
                        <Input 
                          type="color"
                          value={form.backgroundColor || '#1f2937'} 
                          onChange={handleChange('backgroundColor')}
                          className="w-16 h-10 p-1 rounded cursor-pointer"
                        />
                        <Input 
                          value={form.backgroundColor || '#1f2937'} 
                          onChange={handleChange('backgroundColor')}
                          placeholder="#1f2937"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {editingSample?.layout === 'home.cozy_space' && (
                <div>
                  <Label>Texte alternatif de l'image</Label>
                  <Input value={form.imageAlt} onChange={handleChange('imageAlt')} placeholder="Description de l'image pour l'accessibilité" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveTemplate}>Enregistrer</Button>
                <Button variant="ghost" onClick={handleCloseEditor}>Annuler</Button>
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
                  {renderPreviewForCurrent()}
                </div>
              </div>
            </div>
          </div>
}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default BlockSamplesPanel;