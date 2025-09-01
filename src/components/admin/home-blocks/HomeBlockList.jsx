import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import {
  Search, Plus, Star, Eye, MessageSquare, ThumbsUp, MoreVertical, Loader2, AlertCircle, Code, Layers, Edit, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
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

const HomeBlockList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [view, setView] = useState(() => searchParams.get('view') || 'list');
  const [selectedBlockId, setSelectedBlockId] = useState(() => searchParams.get('blockId') || null);

  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
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
    const tab = searchParams.get('tab');
    if (tab) {
      newSearchParams.set('tab', tab);
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [view, selectedBlockId, setSearchParams]);


  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  // Filters state
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [isFeatured, setIsFeatured] = useState(searchParams.get('featured') === 'true');
  const [sortField, setSortField] = useState(searchParams.get('sortField') || 'created_at');
  const [sortDir, setSortDir] = useState(searchParams.get('sortDir') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [perPage, setPerPage] = useState(20);
  const [previewingBlock, setPreviewingBlock] = useState(null);

  const [debouncedQuery] = useDebounce(query, 300);

  const fetchContentBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters = {
        title: debouncedQuery,
        status: status === 'all' ? '' : status,
        featured: isFeatured,
    };

    const sort = { field: sortField, dir: sortDir };

    try {
        const { data, error: rpcError } = await supabase.functions.invoke('content-blocks-search', {
            body: { filters, sort, page, perPage },
        });

        if (rpcError) throw rpcError;
        if (data.error) throw new Error(data.error);

        setBlocks(data.items || []);
        setTotal(data.total || 0);
    } catch (err) {
        console.error("Error fetching content blocks:", err);
        setError("Erreur lors de la récupération des blocs de contenu. " + err.message);
        toast({ title: "Erreur", description: "Impossible de charger les blocs.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [debouncedQuery, status, isFeatured, sortField, sortDir, page, perPage, toast]);
  
  useEffect(() => {
    if (view === 'list') {
      fetchContentBlocks();
      const newSearchParams = new URLSearchParams(searchParams);
      if(query) newSearchParams.set('query', query); else newSearchParams.delete('query');
      if(status !== 'all') newSearchParams.set('status', status); else newSearchParams.delete('status');
      if(isFeatured) newSearchParams.set('featured', 'true'); else newSearchParams.delete('featured');
      if(sortField !== 'created_at') newSearchParams.set('sortField', sortField); else newSearchParams.delete('sortField');
      if(sortDir !== 'desc') newSearchParams.set('sortDir', sortDir); else newSearchParams.delete('sortDir');
      if(page > 1) newSearchParams.set('page', page.toString()); else newSearchParams.delete('page');
      
      const tab = searchParams.get('tab');
      if (tab) {
        newSearchParams.set('tab', tab);
      }
      
      if (searchParams.get('view')) newSearchParams.set('view', searchParams.get('view'));
      if (searchParams.get('blockId')) newSearchParams.set('blockId', searchParams.get('blockId'));

      setSearchParams(newSearchParams, { replace: true });
    }
  }, [debouncedQuery, status, isFeatured, sortField, sortDir, page, view, fetchContentBlocks]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(total / perPage)) {
        setPage(newPage);
    }
  };
  
  const handleFeatureToggle = async (block) => {
    const newPriority = block.priority > 0 ? 0 : 1;
    const { error } = await supabase.from('content_blocks').update({ priority: newPriority }).eq('id', block.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut 'à la une'.", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Statut 'à la une' mis à jour." });
      fetchContentBlocks();
    }
  };

  const handleEdit = (blockId) => {
    setSelectedBlockId(blockId);
    setView('edit');
  };

  const handleCreate = () => {
    setSelectedBlockId(null);
    setView('edit');
  };
  
  const handleBackToList = () => {
    setView('list');
    setSelectedBlockId(null);
  };
  
  const handleSave = (savedBlock) => {
    fetchContentBlocks();
    handleBackToList();
  }

  const handlePreview = (block) => {
    setPreviewingBlock(block);
  };

  const handleDelete = (blockId) => {
    toast({
      title: 'Confirmation requise',
      description: `Êtes-vous sûr de vouloir supprimer ce bloc ? Cette action est irréversible.`,
      action: (
        <Button variant="destructive" onClick={async () => {
           const { error } = await supabase.from('content_blocks').delete().eq('id', blockId);
           if (error) {
             toast({ title: "Erreur", description: "Impossible de supprimer le bloc.", variant: "destructive" });
           } else {
             toast({ title: "Succès", description: "Bloc supprimé." });
             fetchContentBlocks();
           }
        }}>
          Confirmer la suppression
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-xl font-semibold">Gestion des Blocs Actifs</h2>
        <Button className="rounded-full bg-red-600 hover:bg-red-700 text-white focus:ring-red-500" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un bloque
        </Button>
      </div>
      <div className="bg-muted/50 dark:bg-card/30 p-4 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre..."
              className="pl-10"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="published">Publié</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
            <Checkbox id="featured" checked={isFeatured} onCheckedChange={(checked) => { setIsFeatured(Boolean(checked)); setPage(1); }} />
            <label htmlFor="featured" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Afficher et ordonner les bloques « à la une »
            </label>
        </div>
      </div>
      
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-sm text-muted-foreground">
          <div className="flex gap-4">
             <button className="hover:text-primary" onClick={() => handleAction('advanced-filters')}>Afficher les filtres avancés</button>
             <button className="hover:text-primary" onClick={() => { setQuery(''); setStatus('all'); setIsFeatured(false); setPage(1); }}>Réinitialiser tous les filtres</button>
             <button className="hover:text-primary" onClick={() => handleAction('export')}>Exporter</button>
          </div>
          <div className="flex items-center gap-4">
            <span>Trier par: Les plus récents</span>
          </div>
        </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12 text-center">À la une</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Indicateurs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-red-500"><AlertCircle className="mx-auto h-6 w-6 mb-2" />{error}</TableCell></TableRow>
            ) : blocks.length > 0 ? (
              blocks.map(block => (
                <TableRow key={block.id} className="hover:bg-muted/50">
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => handleFeatureToggle(block)}>
                      <Star className={`h-5 w-5 ${block.priority > 0 ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`} />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => handleEdit(block.id)} className="font-medium text-red-600 hover:underline text-left">
                      {block.title}
                    </button>
                    <div className="text-xs text-muted-foreground">{block.layout}</div>
                  </TableCell>
                  <TableCell>
                     <Badge variant={block.block_type === 'dynamic' ? 'outline' : 'default'} className="flex items-center gap-1 w-fit">
                      {block.block_type === 'dynamic' ? <Layers className="h-3 w-3" /> : <Code className="h-3 w-3" />}
                      {block.block_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={block.status} />
                  </TableCell>
                  <TableCell>{block.publication_date ? new Date(block.publication_date).toLocaleDateString('fr-CH') : '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-center items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1 text-xs"><Eye className="h-4 w-4" /> 0</span>
                      <span className="flex items-center gap-1 text-xs"><MessageSquare className="h-4 w-4" /> 0</span>
                      <span className="flex items-center gap-1 text-xs"><ThumbsUp className="h-4 w-4" /> 0</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(block.id)} disabled={block.block_type !== 'html'}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Éditer</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePreview(block)} disabled={block.block_type !== 'dynamic'}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Prévisualiser</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('duplicate', block.id)}>
                            <span>Dupliquer</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleDelete(block.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Supprimer</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Aucun bloc trouvé.</TableCell></TableRow>
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