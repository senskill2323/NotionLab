import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { 
  Eye, Edit, Trash2, MoreHorizontal, MoreVertical, Search, Plus, 
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Archive, RotateCcw, Copy, 
  ArrowUpDown, ArrowUp, ArrowDown, X, Check, Bookmark, Loader2, 
  AlertCircle, Layers, Code 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { emitSessionRefresh, useSessionRefresh } from '@/lib/sessionRefreshBus';
import { useToast } from '@/components/ui/use-toast';
import EditHomeBlockPage from '@/pages/admin/EditHomeBlockPage';
import BlockPreview from '@/components/admin/home-blocks/BlockPreview';

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center space-x-1">
      <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Précédent</Button>
      {pages.map(p => (
        <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => onPageChange(p)}>
          {p}
        </Button>
      ))}
      <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Suivant</Button>
    </div>
  );
};

const HomeBlockList = ({ mode = 'list', refreshKey = 0, activeSubTab = 'list' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Use sessionStorage to persist editor state across tab switches and component remounts
  const getPersistedEditorState = () => {
    try {
      const stored = sessionStorage.getItem('homeBlockEditor');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if stored state is still valid (not older than 1 hour)
        if (Date.now() - parsed.timestamp < 3600000) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored editor state:', e);
    }
    return null;
  };

  const persistEditorState = (view, blockId) => {
    try {
      if (view === 'edit') {
        sessionStorage.setItem('homeBlockEditor', JSON.stringify({
          view,
          blockId,
          timestamp: Date.now()
        }));
      } else {
        sessionStorage.removeItem('homeBlockEditor');
      }
    } catch (e) {
      console.warn('Failed to persist editor state:', e);
    }
  };

  const [view, setView] = useState(() => {
    // First check sessionStorage for persisted state
    const persistedState = getPersistedEditorState();
    if (persistedState && persistedState.view === 'edit') {
      return 'edit';
    }
    
    // Fallback to URL params
    const urlView = searchParams.get('view');
    const urlBlockId = searchParams.get('blockId');
    return urlView === 'edit' && (urlBlockId || urlView === 'edit') ? 'edit' : 'list';
  });

  const [selectedBlockId, setSelectedBlockId] = useState(() => {
    // First check sessionStorage for persisted state
    const persistedState = getPersistedEditorState();
    if (persistedState && persistedState.view === 'edit') {
      return persistedState.blockId;
    }
    
    // Fallback to URL params
    return searchParams.get('blockId') || null;
  });

  // Persist editor state whenever it changes
  useEffect(() => {
    persistEditorState(view, selectedBlockId);
  }, [view, selectedBlockId]);

  // Listen to realtime changes on content_blocks to refresh list/dashboard automatically.
  useEffect(() => {
    const channel = supabase
      .channel('content_blocks-home-blocks-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_blocks' },
        () => emitSessionRefresh({ source: 'content-blocks-realtime' }),
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Clear persisted state on component unmount
  useEffect(() => {
    return () => {
      if (view !== 'edit') {
        sessionStorage.removeItem('homeBlockEditor');
      }
    };
  }, [view]);

  useEffect(() => {
    // Only manage URL when we're on the 'list' subtab (read fresh params)
    const freshParams = new URLSearchParams(window.location.search);
    const currentSubtab = freshParams.get('subtab') || 'list';
    if (currentSubtab !== 'list') return;

    // Prevent URL updates if we're in edit mode to avoid conflicts with parent component
    if (view === 'edit') {
      return;
    }

    const newSearchParams = new URLSearchParams(freshParams);
    if (view === 'edit') {
      newSearchParams.set('view', 'edit');
      if (selectedBlockId) {
        newSearchParams.set('blockId', selectedBlockId);
      } else {
        newSearchParams.delete('blockId');
      }
    } else {
      newSearchParams.delete('view');
      newSearchParams.delete('blockId');
    }
    // preserve tab
    const tab = freshParams.get('tab');
    if (tab) {
      newSearchParams.set('tab', tab);
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [view, selectedBlockId, setSearchParams]);

  // Refetch when parent indicates a refresh or when tab switches back to list
  useEffect(() => {
    if (activeSubTab === 'list') {
      fetchContentBlocks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, activeSubTab]);


  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  // Filters state
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [sortField, setSortField] = useState(searchParams.get('sortField') || 'order_index');
  const [sortDir, setSortDir] = useState(searchParams.get('sortDir') || 'asc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [perPage, setPerPage] = useState(20);
  const [previewingBlock, setPreviewingBlock] = useState(null);
  // Inline title editing state
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [titleDraft, setTitleDraft] = useState('');

  const isArchivesMode = mode === 'archives';

  const [debouncedQuery] = useDebounce(query, 300);

  const fetchContentBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const effectiveStatus = isArchivesMode ? 'archived' : status;
    const filters = {
      title: debouncedQuery?.trim?.() || '',
      status: effectiveStatus === 'all' ? '' : effectiveStatus,
    };

    const sort = { field: sortField, dir: sortDir };

    const fallbackQuery = async () => {
      let query = supabase.from('content_blocks').select('*', { count: 'exact' });
      if (filters.title) {
        query = query.ilike('title', `%${filters.title}%`);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      } else if (isArchivesMode) {
        query = query.eq('status', 'archived');
      }

      query = query.order(sortField, { ascending: sortDir !== 'desc' });
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data: items, count, error: qErr } = await query;
      if (qErr) throw qErr;
      return { items: items ?? [], total: count ?? 0 };
    };

    try {
      const { data, error: edgeError } = await supabase.functions.invoke('content-blocks-search', {
        body: {
          filters,
          sort,
          page,
          perPage,
        },
      });

      if (edgeError) {
        throw new Error(edgeError.message || 'content-blocks-search failed');
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Réponse vide du service de recherche des blocs.');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const totalCount = Number(data.total ?? 0);
      const pageSize = Number(data.perPage ?? perPage);

      setBlocks(items);
      setTotal(Number.isFinite(totalCount) ? totalCount : 0);
      if (Number.isFinite(pageSize) && pageSize > 0 && pageSize !== perPage) {
        setPerPage(pageSize);
      }
    } catch (err) {
      console.warn('content-blocks-search failed, falling back to direct query', err);
      try {
        const fallback = await fallbackQuery();
        setBlocks(fallback.items);
        setTotal(fallback.total);
      } catch (fallbackError) {
        console.error('Content blocks query failed:', fallbackError);
        setError("Erreur lors de la récupération des blocs de contenu. " + (fallbackError?.message || ''));
        toast({ title: "Erreur", description: "Impossible de charger les blocs.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, status, sortField, sortDir, page, perPage, toast, mode, isArchivesMode]);

  useSessionRefresh(() => {
    if (view === 'list' && activeSubTab === 'list') {
      fetchContentBlocks();
    }
  }, [fetchContentBlocks, view, activeSubTab]);

  useEffect(() => {
    if (view === 'list') {
      fetchContentBlocks();
    }
    
    // Don't manage URL parameters when in edit mode to prevent conflicts
    if (view === 'edit') {
      return;
    }

    // Only manage URL when we're on the 'list' subtab (read fresh params)
    const freshParams = new URLSearchParams(window.location.search);
    const currentSubtab = freshParams.get('subtab') || 'list';
    if (currentSubtab !== 'list') return;

    const newSearchParams = new URLSearchParams(freshParams);
    if (query) newSearchParams.set('query', query); else newSearchParams.delete('query');
    if (status !== 'all') newSearchParams.set('status', status); else newSearchParams.delete('status');
    if (sortField !== 'order_index') newSearchParams.set('sortField', sortField); else newSearchParams.delete('sortField');
    if (sortDir !== 'asc') newSearchParams.set('sortDir', sortDir); else newSearchParams.delete('sortDir');
    if (page > 1) newSearchParams.set('page', page.toString()); else newSearchParams.delete('page');

    const tab = freshParams.get('tab');
    if (tab) {
      newSearchParams.set('tab', tab);
    }

    setSearchParams(newSearchParams, { replace: true });
  }, [debouncedQuery, status, sortField, sortDir, page, view, fetchContentBlocks]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(total / perPage)) {
      setPage(newPage);
    }
  };

  const handleMove = async (block, direction) => {
    // Réordonnancement fiable: échange l'order_index avec le voisin immédiat affiché
    try {
      const currentIndex = blocks.findIndex(b => b.id === block.id);
      if (currentIndex === -1) return;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= blocks.length) return;

      const neighbor = blocks[targetIndex];
      if (!neighbor) return;

      const aOld = block.order_index;
      const bOld = neighbor.order_index;

      // 1) Récupérer un index temporaire unique pour éviter toute collision d'unicité
      let tempIndex = aOld;
      try {
        const { data: rows, error: maxErr } = await supabase
          .from('content_blocks')
          .select('order_index')
          .neq('status', 'archived')
          .order('order_index', { ascending: false })
          .limit(1);
        if (maxErr) throw maxErr;
        const maxOrder = Array.isArray(rows) && rows.length > 0 && typeof rows[0].order_index === 'number' ? rows[0].order_index : 0;
        tempIndex = maxOrder + 1;
      } catch (e) {
        // Fallback si échec: utiliser un timestamp (toujours positif et très grand)
        tempIndex = Math.floor(Date.now() / 1000);
      }

      // 2) Déplacer le bloc courant sur l'index temporaire pour libérer son index d'origine
      let { error: e1 } = await supabase
        .from('content_blocks')
        .update({ order_index: tempIndex, updated_at: new Date().toISOString() })
        .eq('id', block.id);
      if (e1) throw e1;

      // 3) Donner l'ancien index du bloc courant au voisin
      let { error: e2 } = await supabase
        .from('content_blocks')
        .update({ order_index: aOld, updated_at: new Date().toISOString() })
        .eq('id', neighbor.id);
      if (e2) {
        // tentative de rollback
        await supabase.from('content_blocks').update({ order_index: aOld }).eq('id', block.id);
        throw e2;
      }

      // 4) Donner l'ancien index du voisin au bloc courant
      let { error: e3 } = await supabase
        .from('content_blocks')
        .update({ order_index: bOld, updated_at: new Date().toISOString() })
        .eq('id', block.id);
      if (e3) {
        // rollback pour garder un état cohérent
        try { await supabase.from('content_blocks').update({ order_index: bOld }).eq('id', neighbor.id); } catch {}
        try { await supabase.from('content_blocks').update({ order_index: aOld }).eq('id', block.id); } catch {}
        throw e3;
      }

      // Optimistic UI: échanger dans la liste locale pour un retour instantané
      setBlocks(prev => {
        const copy = [...prev];
        const a = copy[currentIndex];
        const b = copy[targetIndex];
        if (!a || !b) return prev;
        // échanger les éléments
        copy[currentIndex] = b;
        copy[targetIndex] = a;
        // mettre à jour les order_index locaux
        copy[currentIndex].order_index = aOld;
        copy[targetIndex].order_index = bOld;
        return copy;
      });

      toast({ title: 'Succès', description: 'Ordre mis à jour.' });
      // Puis resynchroniser depuis la base pour refléter d'éventuels tri/filtres
      fetchContentBlocks();
    } catch (err) {
      // Fallback: essayer le RPC existant si la stratégie locale échoue
      try {
        const { error } = await supabase.rpc('home_blocks_move', { p_id: block.id, p_direction: direction });
        if (error) throw error;
        toast({ title: 'Succès', description: 'Ordre mis à jour.' });
        fetchContentBlocks();
      } catch (err2) {
        toast({ title: 'Erreur', description: `Impossible de réordonner: ${(err2?.message || err?.message || 'Inconnu')}` , variant: 'destructive' });
      }
    }
  };

  const handleStatusChange = async (block, newStatus) => {
    try {
      const { error } = await supabase.rpc('home_blocks_set_status', { p_id: block.id, p_status: newStatus });
      if (error) {
        const msg = error?.message || '';
        // Fallback si ambiguité de fonction (double définition ENUM/TEXT côté SQL)
        if (msg.includes('Could not choose the best candidate function') || msg.includes('home_blocks_set_status')) {
          const { error: fallbackError } = await supabase
            .from('content_blocks')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', block.id);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
      toast({ title: 'Succès', description: 'Statut mis à jour.' });
      fetchContentBlocks();
    } catch (err) {
      toast({ title: 'Erreur', description: `Impossible de changer le statut: ${err.message}`, variant: 'destructive' });
    }
  };

  // Duplicate a block
  const handleDuplicate = async (blockId) => {
    try {
      const { data, error } = await supabase.rpc('home_blocks_duplicate', { p_id: blockId });
      if (error) throw error;
      toast({ title: 'Succès', description: 'Bloc dupliqué.' });
      fetchContentBlocks();
    } catch (err) {
      toast({ title: 'Erreur', description: `Impossible de dupliquer: ${err.message}`, variant: 'destructive' });
    }
  };

  // Save block as template
  const handleSaveAsTemplate = async (block) => {
    try {
      // Fetch full block data
      const { data: fullBlock, error: fetchError } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('id', block.id)
        .single();

      if (fetchError) throw fetchError;

      // Check if template with same title and layout already exists
      const { data: existingTemplates, error: checkError } = await supabase
        .from('block_samples')
        .select('title')
        .eq('title', fullBlock.title)
        .eq('layout', fullBlock.layout);

      if (checkError) throw checkError;

      // Generate unique title if needed
      let templateTitle = fullBlock.title;
      if (existingTemplates && existingTemplates.length > 0) {
        templateTitle = `${fullBlock.title} (Modèle)`;
        
        // Check if the suffixed version also exists
        const { data: suffixedExists } = await supabase
          .from('block_samples')
          .select('title')
          .eq('title', templateTitle)
          .eq('layout', fullBlock.layout);

        if (suffixedExists && suffixedExists.length > 0) {
          templateTitle = `${fullBlock.title} (Modèle ${Date.now()})`;
        }
      }

      // Prepare template payload
      const templatePayload = {
        title: templateTitle,
        block_type: fullBlock.block_type,
        layout: fullBlock.layout,
        content: fullBlock.content
      };

      // Insert into block_samples and return the created row id for diagnostic
      const { data: createdRows, error: insertError } = await supabase
        .from('block_samples')
        .insert([templatePayload])
        .select('id, title, layout')
        .limit(1);

      if (insertError) throw insertError;

      const created = Array.isArray(createdRows) ? createdRows[0] : createdRows;

      toast({ 
        title: 'Succès', 
        description: created?.id
          ? `Modèle créé (#${created.id}) sous le nom "${templateTitle}" pour le layout ${created.layout}.`
          : `Le bloc "${fullBlock.title}" a été enregistré comme modèle sous le nom "${templateTitle}".` 
      });

    } catch (err) {
      console.error('Save as template failed:', err);
      toast({ 
        title: 'Erreur', 
        description: `Impossible d'enregistrer comme modèle: ${err.message}`, 
        variant: 'destructive' 
      });
    }
  };

  const handleEdit = (blockId) => {
    // Sync URL immediately so the editor state survives focus changes/remounts
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set('subtab', 'list');
      sp.set('view', 'edit');
      if (blockId) sp.set('blockId', String(blockId));
      // Clear any template editing flags to avoid being bounced to the Samples tab
      sp.delete('editing');
      sp.delete('sampleId');
      setSearchParams(sp, { replace: true });
    } catch (e) {
      // ignore URL sync errors
    }
    setSelectedBlockId(blockId);
    setView('edit');
  };

  const handleCreate = () => {
    // Same URL sync for the creation flow
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set('subtab', 'list');
      sp.set('view', 'edit');
      sp.delete('blockId');
      // Clear any template editing flags to avoid being bounced to the Samples tab
      sp.delete('editing');
      sp.delete('sampleId');
      setSearchParams(sp, { replace: true });
    } catch (e) {}
    setSelectedBlockId(null);
    setView('edit');
  };

  const handleBackToList = useCallback(() => {
    // Clear the URL parameters for edit mode
    const sp = new URLSearchParams(window.location.search);
    sp.delete('view');
    sp.delete('blockId');
    // Also ensure any lingering template editing flags are removed
    sp.delete('editing');
    sp.delete('sampleId');
    setSearchParams(sp, { replace: true });
    
    // Clear persisted editor state
    sessionStorage.removeItem('homeBlockEditor');
    
    setView('list');
    setSelectedBlockId(null);
  }, [setSearchParams]);

  const handleSave = useCallback(
    (savedBlock) => {
      fetchContentBlocks();
      handleBackToList();
    },
    [fetchContentBlocks, handleBackToList],
  );

  const handlePreview = (block) => {
    setPreviewingBlock(block);
  };

  const handleDelete = (blockId) => {
    toast({
      title: 'Confirmation requise',
      description: `Êtes-vous sûr de vouloir masquer ce bloc (archiver) ?`,
      action: (
        <Button variant="destructive" onClick={async () => {
          try {
            // Récupérer le titre du bloc pour le feedback
            const { data: blockData, error: fetchError } = await supabase
              .from('content_blocks')
              .select('title')
              .eq('id', blockId)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
              throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
            }

            const blockTitle = blockData?.title || 'ce bloc';

            const { error } = await supabase
              .from('content_blocks')
              .update({ status: 'archived', updated_at: new Date().toISOString() })
              .eq('id', blockId);

            if (error) {
              throw error;
            }

            toast({ 
              title: "Succès", 
              description: `Le bloc "${blockTitle}" a été archivé et ne sera plus visible sur le site.` 
            });
            fetchContentBlocks();
          } catch (err) {
            console.error('Archive failed:', err);
            toast({ 
              title: "Erreur", 
              description: err.message || "Impossible d'archiver le bloc. Veuillez réessayer.", 
              variant: "destructive" 
            });
          }
        }}>
          Confirmer l'archivage
        </Button>
      ),
    });
  };

  const handleAction = (action) => {
    toast({
      title: '🚧 Fonctionnalité en cours de développement',
      description: "Cette action n'est pas encore implémentée.",
    });
  }

  // Inline title edit handlers
  const startEditTitle = (block) => {
    setEditingTitleId(block.id);
    setTitleDraft(block.title || '');
  };
  const saveTitle = async () => {
    if (!editingTitleId) return;
    try {
      const { error } = await supabase.rpc('home_blocks_set_title', { p_id: editingTitleId, p_title: titleDraft });
      if (error) throw error;
      toast({ title: 'Succès', description: 'Titre mis à jour.' });
      setEditingTitleId(null);
      fetchContentBlocks();
    } catch (err) {
      toast({ title: 'Erreur', description: `Impossible de modifier le titre: ${err.message}`, variant: 'destructive' });
    }
  };
  const cancelTitle = () => setEditingTitleId(null);

  const StatusBadge = ({ status }) => {
    const variants = {
      published: 'success',
      draft: 'secondary',
      archived: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const totalPages = Math.ceil(total / perPage);

  if (view === 'edit') {
    return <EditHomeBlockPage blockId={selectedBlockId} onBack={handleBackToList} onSave={handleSave} />;
  }

  const handleHardDelete = (blockId) => {
    toast({
      title: 'Confirmation requise',
      description: "Cette action est irréversible. Supprimer définitivement ce bloc ?",
      action: (
        <Button variant="destructive" onClick={async () => {
          try {
            // Vérifier d'abord si le bloc existe
            const { data: blockExists, error: checkError } = await supabase
              .from('content_blocks')
              .select('id, title')
              .eq('id', blockId)
              .single();

            if (checkError && checkError.code !== 'PGRST116') {
              throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
            }

            if (!blockExists) {
              toast({
                title: "Bloc introuvable",
                description: "Ce bloc n'existe plus ou a déjà été supprimé.",
                variant: "destructive",
              });
              fetchContentBlocks();
              return;
            }

            // Procéder à la suppression
            const { error } = await supabase.rpc('home_blocks_delete_hard', { p_id: blockId });
            
            if (error) {
              // Gérer les différents types d'erreurs
              if (error.message.includes('owner/admin')) {
                throw new Error("Vous n'avez pas les permissions nécessaires pour supprimer définitivement ce bloc. Seuls les propriétaires et administrateurs peuvent effectuer cette action.");
              } else if (error.message.includes('non trouvé')) {
                throw new Error("Ce bloc n'existe plus ou a déjà été supprimé.");
              } else {
                throw error;
              }
            }

            toast({ 
              title: "Succès", 
              description: `Le bloc "${blockExists.title}" a été supprimé définitivement.` 
            });
            fetchContentBlocks();
          } catch (err) {
            console.error('Hard delete failed:', err);
            toast({
              title: "Erreur de suppression",
              description: err.message || "Impossible de supprimer définitivement ce bloc. Veuillez réessayer ou contacter l'administrateur.",
              variant: "destructive",
            });
          }
        }}>
          Supprimer définitivement
        </Button>
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2 flex-col md:flex-row md:items-center">
        <Button className="rounded-full bg-red-600 hover:bg-red-700 text-white focus:ring-red-500" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un bloque
        </Button>
      </div>
      <div className="rounded-lg border bg-muted/30 dark:bg-card/30/60 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="blocks-search" className="mb-2 block text-sm font-medium">
              Rechercher un bloc
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="blocks-search"
                placeholder="Rechercher un bloc..."
                className="pl-10"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          {!isArchivesMode && (
            <div className="w-full md:w-64">
              <Label htmlFor="status-filter" className="mb-2 block text-sm font-medium">
                Filtrer par statut
              </Label>
              <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm text-muted-foreground">
          <div className="flex gap-4">
            <button className="hover:text-primary" onClick={() => handleAction('advanced-filters')}>Afficher les filtres avancés</button>
            <button className="hover:text-primary" onClick={() => { setQuery(''); setStatus('all'); setPage(1); }}>Réinitialiser tous les filtres</button>
            <button className="hover:text-primary" onClick={() => handleAction('export')}>Exporter</button>
          </div>
          <div className="flex items-center gap-4">
            <span>Trier par: Les plus récents</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 text-sm">
              <TableHead className="w-12 text-center">Prévisualiser</TableHead>
              <TableHead className="w-24 text-center">Ordre</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center hidden">Indicateurs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center text-red-500"><AlertCircle className="mx-auto h-6 w-6 mb-2" />{error}</TableCell></TableRow>
            ) : blocks.length > 0 ? (
              blocks.map((block, idx) => (
                <TableRow key={block.id} className="hover:bg-muted/50 text-sm">
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(block)}
                      disabled={block.block_type !== 'dynamic'}
                      aria-label="Prévisualiser le bloc"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="outline" size="icon" onClick={() => handleMove(block, 'up')} disabled={idx === 0 || block.status === 'archived'}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleMove(block, 'down')} disabled={idx === blocks.length - 1 || block.status === 'archived'}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingTitleId === block.id ? (
                      <Input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle();
                          if (e.key === 'Escape') cancelTitle();
                        }}
                        onBlur={saveTitle}
                        autoFocus
                        className="max-w-md"
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        {block.layout === 'home.formations' ? (
                          <span className="font-medium text-left">{block.title}</span>
                        ) : (
                          <button onClick={() => handleEdit(block.id)} className="font-medium text-red-600 hover:underline text-left">
                            {block.title}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">{block.layout}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={block.block_type === 'dynamic' ? 'outline' : 'default'} className="flex items-center gap-1 w-fit">
                      {block.block_type === 'dynamic' ? <Layers className="h-3 w-3" /> : <Code className="h-3 w-3" />}
                      {block.block_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={block.status} onValueChange={(value) => handleStatusChange(block, value)}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="published">Publié</SelectItem>
                        <SelectItem value="archived">Masqué</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{block.publication_date ? new Date(block.publication_date).toLocaleDateString('fr-CH') : '-'}</TableCell>
                  <TableCell className="hidden" />
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(block.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Éditer</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePreview(block)} disabled={block.block_type !== 'dynamic'}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>Prévisualiser</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(block.id)}>
                          <span>Dupliquer</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startEditTitle(block)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Renommer</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSaveAsTemplate(block)}>
                          <Bookmark className="mr-2 h-4 w-4" />
                          <span>Enregistrer comme modèle</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleDelete(block.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Archiver</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleHardDelete(block.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Supprimer définitivement</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={8} className="h-24 text-center">Aucun bloc trouvé.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
        <span>{`Affiche ${blocks.length} sur ${total} trouvé(s)`}</span>
        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>

      <BlockPreview
        block={previewingBlock}
        isOpen={!!previewingBlock}
        onOpenChange={(isOpen) => !isOpen && setPreviewingBlock(null)}
      />

    </div>
  );
};

export default HomeBlockList;

