import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import DOMPurify from 'dompurify';

// Import des composants de blocs
import CozySpaceSectionWithUpload from '@/components/admin/home-blocks/CozySpaceSectionWithUpload';
import homeBlockRegistry from '@/components/home/homeBlockRegistry';

const componentMap = {
  ...homeBlockRegistry,
  'home.cozy_space': CozySpaceSectionWithUpload,
};

const getStatusColor = (status) => {
  switch (status) {
    case 'published': return 'bg-green-500';
    case 'draft': return 'bg-yellow-500';
    case 'archived': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'published': return 'Publié';
    case 'draft': return 'Brouillon';
    case 'archived': return 'Archivé';
    default: return 'Inconnu';
  }
};

const HomepagePanel = () => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [hiddenBlocks, setHiddenBlocks] = useState(new Set());

  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .neq('status', 'archived')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setBlocks(data || []);
    } catch (err) {
      console.error('Error loading homepage blocks:', err);
      setError("Impossible de charger les blocs de la page d'accueil.");
      toast({
        title: "Erreur",
        description: "Impossible de charger les blocs de la page d'accueil.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const toggleBlockVisibility = (blockId) => {
    setHiddenBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  const renderBlock = useCallback((block) => {
    const Component = componentMap[block.layout];
    if (!Component) {
      return (
        <div className="p-4 border border-dashed border-muted-foreground/30 rounded-lg">
          <p className="text-muted-foreground text-sm">
            Composant non trouvé pour le layout: <code>{block.layout}</code>
          </p>
        </div>
      );
    }

    try {
      if (block.block_type === 'html') {
        // Sanitiser le contenu HTML pour éviter les attaques XSS
        const sanitizedContent = DOMPurify.sanitize(block.content || '', {
          ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'br', 'img', 'a'],
          ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title', 'target']
        });
        
        return (
          <div 
            className="w-full"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
          />
        );
      }

      return <Component content={block.content || {}} isPreview={true} />;
    } catch (error) {
      console.error(`Erreur lors du rendu du bloc ${block.id}:`, error);
      return (
        <div className="p-4 border border-dashed border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-medium">Erreur de rendu</p>
          </div>
          <p className="text-red-500 text-xs mt-1">
            Impossible de rendre le bloc "{block.title}" ({block.layout})
          </p>
        </div>
      );
    }
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement de la page d'accueil...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Erreur de chargement
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={fetchBlocks} 
            variant="outline"
            aria-label="Réessayer le chargement des blocs"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { publishedBlocks, draftBlocks } = useMemo(() => {
    const published = blocks.filter(block => block.status === 'published');
    const draft = blocks.filter(block => block.status === 'draft');
    return { publishedBlocks: published, draftBlocks: draft };
  }, [blocks]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Aperçu de la Page d'Accueil</CardTitle>
              <CardDescription>
                Visualisez les blocs qui composent votre page d'accueil
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                Mobile
              </Button>
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                Desktop
              </Button>
              <Button 
                onClick={fetchBlocks} 
                variant="outline" 
                size="sm"
                aria-label="Actualiser les blocs"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                {publishedBlocks.length} Publié{publishedBlocks.length > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                {draftBlocks.length} Brouillon{draftBlocks.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {blocks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucun bloc configuré pour la page d'accueil.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {blocks.map((block, index) => {
            const isHidden = hiddenBlocks.has(block.id);
            
            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(block.status)}`}></div>
                          {getStatusLabel(block.status)}
                        </Badge>
                        <h3 className="font-medium">{block.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {block.layout}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBlockVisibility(block.id)}
                        aria-label={isHidden ? `Afficher le bloc ${block.title}` : `Masquer le bloc ${block.title}`}
                        aria-pressed={!isHidden}
                      >
                        {isHidden ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {!isHidden && (
                    <CardContent className="pt-0">
                      <div className={`
                        border rounded-lg overflow-hidden bg-background
                        ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'}
                      `}>
                        {renderBlock(block)}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomepagePanel;
