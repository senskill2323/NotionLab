import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import {
  AlertCircle,
  Copy,
  Edit,
  Eye,
  Layers,
  Loader2,
  MoreVertical,
  Plus,
  Search as SearchIcon,
  Trash2,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  getLayoutDefinition,
  getLayoutKeys,
} from '@/components/admin/home-blocks/layoutRegistry';
import { buildHomeBlockEditorBundle } from '@/components/admin/home-blocks/useHomeBlockEditor';

const DEFAULT_LAYOUT = 'home.main_hero';

const BUILTIN_SAMPLE_LAYOUTS = [
  { layout: 'home.main_hero', title: 'Accueil - Hero Principal' },
  { layout: 'home.systems_showcase', title: 'Accueil - Vitrine' },
  { layout: 'home.fullpage_wideimage', title: 'Accueil - Image large' },
  { layout: 'home.promise', title: 'Accueil - Promesse' },
  { layout: 'home.cozy_space', title: 'Accueil - Espace confortable' },
  { layout: 'home.personal_quote', title: 'Accueil - Citation' },
  { layout: 'home.personal_quote_image', title: 'Accueil - Citation + image' },
  { layout: 'home.launch_cta', title: 'Accueil - Lancement' },
  { layout: 'home.final_cta', title: 'Accueil - Final CTA' },
  { layout: 'home.stats', title: 'Accueil - Statistiques' },
  { layout: 'home.formations', title: 'Accueil - Formations' },
  { layout: 'home.support', title: 'Accueil - Support' },
  { layout: 'home.mask_reveal_scroll', title: 'Accueil - Masque defilant' },
  { layout: 'home.testimonials', title: 'Accueil - Testimonials' },
  { layout: 'home.google_reviews', title: 'Accueil - Avis Google' },
  { layout: 'home.tubes_cursor', title: 'Accueil - Tubes interactifs' },
  { layout: 'global.footer', title: 'Global - Pied de page' },
  { layout: 'home.header', title: 'Accueil - Header HTML', block_type: 'html' },
];

const BUILTIN_SAMPLES = BUILTIN_SAMPLE_LAYOUTS.map(({ layout, title, block_type }) => {
  if (block_type === 'html') {
    return {
      title,
      block_type: 'html',
      layout,
      content: '<section><h1>Bloc HTML</h1><p>Personnalisez ce contenu.</p></section>',
    };
  }

  const bundle = buildHomeBlockEditorBundle({
    layout,
    blockType: 'dynamic',
  });

  return {
    title,
    block_type: 'dynamic',
    layout,
    content: bundle.serialized ?? {},
  };
});

const BlockSamplesPanel = ({ onBlockCreated }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSamples, setSelectedSamples] = useState(new Set());
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [layoutFilter, setLayoutFilter] = useState('all');
  const hasSeededRef = useRef(false);

  const layoutOptions = useMemo(() => {
    return getLayoutKeys()
      .map((layout) => {
        const definition = getLayoutDefinition(layout);
        return {
          value: layout,
          label: definition?.label ?? layout,
          blockType: definition?.blockType ?? 'dynamic',
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const filteredSamples = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    return samples.filter((sample) => {
      if (layoutFilter !== 'all' && sample.layout !== layoutFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const title = (sample.title ?? '').toLowerCase();
      const layout = (sample.layout ?? '').toLowerCase();
      return title.includes(normalizedQuery) || layout.includes(normalizedQuery);
    });
  }, [debouncedQuery, layoutFilter, samples]);

  const allFilteredSelected =
    filteredSamples.length > 0 &&
    filteredSamples.every((sample) => selectedSamples.has(sample.id));

  const handleSelectAll = useCallback(
    (checked) => {
      const flag = Boolean(checked);
      setSelectedSamples(flag ? new Set(filteredSamples.map((sample) => sample.id)) : new Set());
    },
    [filteredSamples],
  );

  const handleSelectSample = useCallback((sampleId, checked) => {
    setSelectedSamples((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(sampleId);
      } else {
        next.delete(sampleId);
      }
      return next;
    });
  }, []);


  const handleCreateNewSample = useCallback(() => {
    navigate('/admin/home-blocks/templates/new');
  }, [navigate]);

  const handleEdit = useCallback(
    (sample) => {
      if (!sample?.id) return;
      navigate(`/admin/home-blocks/templates/${sample.id}`);
    },
    [navigate],
  );



  const seedBuiltinSamplesIfNeeded = useCallback(async () => {
    if (hasSeededRef.current) {
      return;
    }

    try {
      const { data: existing, error } = await supabase
        .from('block_samples')
        .select('id')
        .limit(1);
      if (error) throw error;
      if (existing && existing.length > 0) {
        hasSeededRef.current = true;
        return;
      }

      await supabase.from('block_samples').insert(BUILTIN_SAMPLES);
      hasSeededRef.current = true;
    } catch (seedError) {
      console.warn('Seed builtin samples failed:', seedError);
    }
  }, []);

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await seedBuiltinSamplesIfNeeded();
      let queryBuilder = supabase
        .from('block_samples')
        .select('*')
        .order('created_at', { ascending: false });

      if (debouncedQuery?.trim()) {
        queryBuilder = queryBuilder.ilike('title', `%${debouncedQuery.trim()}%`);
      }

      if (layoutFilter !== 'all') {
        queryBuilder = queryBuilder.eq('layout', layoutFilter);
      }

      const { data, error: fetchError } = await queryBuilder;
      if (fetchError) throw fetchError;

      setSamples(data ?? []);
      setSelectedSamples(new Set());
    } catch (fetchError) {
      console.error('Error fetching block samples:', fetchError);
      setError("Erreur lors de la récupération des modèles de blocs.");
      toast({
        title: 'Erreur',
        description: "Impossible de charger les modèles de blocs.",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, layoutFilter, seedBuiltinSamplesIfNeeded, toast]);

  const handleImportFromActiveBlocks = useCallback(async () => {
    try {
      const { data: blocks, error: blocksError } = await supabase
        .from('content_blocks')
        .select('*')
        .neq('status', 'archived');
      if (blocksError) throw blocksError;

      const { data: existing, error: existingError } = await supabase
        .from('block_samples')
        .select('title,layout');
      if (existingError) throw existingError;

      const existingKeys = new Set(
        (existing ?? []).map((item) => `${item.title}__${item.layout}`),
      );

      const payloads = (blocks ?? [])
        .filter((block) => !existingKeys.has(`${block.title}__${block.layout}`))
        .map((block) => {
          if (block.block_type === 'html') {
            return {
              title: `${block.title} (Import)`,
              block_type: 'html',
              layout: block.layout,
              content: typeof block.content === 'string' ? block.content : '',
            };
          }

          const bundle = buildHomeBlockEditorBundle({
            layout: block.layout,
            blockType: 'dynamic',
            content: block.content ?? {},
          });

          return {
            title: `${block.title} (Import)`,
            block_type: 'dynamic',
            layout: bundle.layout,
            content: bundle.serialized ?? {},
          };
        });

      if (payloads.length === 0) {
        toast({
          title: 'Importation',
          description: 'Aucun nouveau modèle à importer.',
        });
        return;
      }

      const { error: insertError } = await supabase
        .from('block_samples')
        .insert(payloads);
      if (insertError) throw insertError;

      toast({
        title: 'Importation terminée',
        description: `${payloads.length} modèle(s) ajouté(s).`,
      });
      fetchSamples();
    } catch (importError) {
      toast({
        title: 'Erreur',
        description: `Importation impossible: ${importError.message}`,
        variant: 'destructive',
      });
    }
  }, [fetchSamples, toast]);

  const handleDelete = useCallback(
    async (sampleId) => {
      if (!sampleId) return;
      const { error: deleteError } = await supabase
        .from('block_samples')
        .delete()
        .eq('id', sampleId);
      if (deleteError) {
        toast({
          title: 'Erreur',
          description: "Impossible de supprimer le modèle.",
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Modèle supprimé' });
      fetchSamples();
    },
    [fetchSamples, toast],
  );

  const handleDuplicate = useCallback(
    async (sample) => {
      if (!sample) return;
      const duplicated = {
        title: `${sample.title} (Copie)`,
        block_type: sample.block_type,
        layout: sample.layout,
        content: sample.content,
      };
      const { error: insertError } = await supabase
        .from('block_samples')
        .insert([duplicated]);
      if (insertError) {
        toast({
          title: 'Erreur',
          description: "Duplication impossible.",
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Modèle dupliqué' });
      fetchSamples();
    },
    [fetchSamples, toast],
  );

  const handleUseTemplate = useCallback(
    async (sample) => {
      if (!sample) return;

      try {
        if (sample.block_type === 'html') {
          const { data, error } = await supabase.rpc('home_blocks_create_html', {
            p_title: `${sample.title} (Copie)`,
            p_content: typeof sample.content === 'string' ? sample.content : '',
            p_layout: sample.layout,
            p_type: 'hero',
            p_status: 'draft',
            p_priority: 0,
          });
          if (error) throw error;
          toast({
            title: 'Bloc créé',
            description: 'Bloc HTML ajouté en brouillon.',
          });
          onBlockCreated?.(data);
          return;
        }

        const bundle = buildHomeBlockEditorBundle({
          layout: sample.layout,
          blockType: 'dynamic',
          content: sample.content ?? {},
        });

        let orderIndex = 1;
        try {
          const { data: rows, error: maxError } = await supabase
            .from('content_blocks')
            .select('order_index')
            .neq('status', 'archived')
            .order('order_index', { ascending: false })
            .limit(1);
          if (!maxError && rows && rows.length > 0) {
            const currentMax = Number(rows[0]?.order_index) || 0;
            orderIndex = currentMax + 1;
          }
        } catch (_) {
          orderIndex = Math.floor(Date.now() / 1000);
        }

        const metadata = {
          title: `${sample.title} (Copie)`,
          status: 'draft',
          type: 'hero',
          block_type: 'dynamic',
          layout: bundle.layout,
          order_index: orderIndex,
          priority: 0,
        };

        const { data, error } = await supabase.functions.invoke('manage-content-block', {
          body: {
            blockId: null,
            metadata,
            content: bundle.serialized ?? {},
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({
          title: 'Bloc créé',
          description: 'Bloc ajouté en brouillon.',
        });
        onBlockCreated?.(data?.id ?? null);
      } catch (useError) {
        toast({
          title: 'Erreur',
          description: `Impossible de créer le bloc: ${useError.message}`,
          variant: 'destructive',
        });
      }
    },
    [onBlockCreated, toast],
  );


  useEffect(() => {
    setSelectedSamples(new Set());
  }, [debouncedQuery, layoutFilter]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);



  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2 flex-col md:flex-row md:items-center">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportFromActiveBlocks}>
            <Layers className="mr-2 h-4 w-4" />
            Importer depuis les blocs actifs
          </Button>
          <Button variant="outline" onClick={fetchSamples}>
            <Loader2 className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={handleCreateNewSample}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau modèle
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-muted/30 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label htmlFor="sample-search" className="mb-2 block text-sm font-medium">
              Rechercher un modèle
            </Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="sample-search"
                placeholder="Rechercher un modèle..."
                className="pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <Label htmlFor="layout-filter" className="mb-2 block text-sm font-medium">
              Filtrer par layout
            </Label>
            <Select value={layoutFilter} onValueChange={setLayoutFilter}>
              <SelectTrigger id="layout-filter">
                <SelectValue placeholder="Tous les layouts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {layoutOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner tous les modèles"
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
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-red-600">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-6 w-6" />
                    <span>{error}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : samples.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Aucun modèle enregistré.
                </TableCell>
              </TableRow>
            ) : filteredSamples.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucun modèle ne correspond à la recherche.
                </TableCell>
              </TableRow>
            ) : (
              filteredSamples.map((sample) => (
                <TableRow key={sample.id} className="hover:bg-muted/20">
                  <TableCell>
                    <Checkbox
                      checked={selectedSamples.has(sample.id)}
                      onCheckedChange={(checked) =>
                        handleSelectSample(sample.id, checked)
                      }
                      aria-label={`Sélectionner ${sample.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{sample.title}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {sample.layout}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={sample.block_type === 'dynamic' ? 'outline' : 'secondary'}
                      className="flex items-center gap-1 w-fit"
                    >
                      {sample.block_type === 'dynamic' ? (
                        <Layers className="h-3 w-3" />
                      ) : (
                        <Code className="h-3 w-3" />
                      )}
                      {sample.block_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUseTemplate(sample)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Utiliser ce modèle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(sample)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Éditer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(sample)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/40"
                          onClick={() => handleDelete(sample.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  );
};

export default BlockSamplesPanel;
