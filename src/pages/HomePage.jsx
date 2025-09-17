import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import DOMPurify from 'dompurify';
import { supabase } from '@/lib/customSupabaseClient';
import homeBlockRegistry from '@/components/home/homeBlockRegistry';
import Footer from '@/components/Footer';

const HomePage = () => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBlocks = async () => {
      setLoading(true);
      setError(null);
      try {
        const timeoutMs = 10000; // 10s
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
        const query = (async () => {
          const { data, error } = await supabase
            .from('content_blocks')
            .select('*')
            .eq('status', 'published')
            .order('order_index', { ascending: true });
          if (error) throw error;
          return data;
        })();

        const data = await Promise.race([query, timeout]);
        if (!isMounted) return;
        setBlocks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading homepage blocks:', err);
        if (!isMounted) return;
        if (String(err?.message || '').toLowerCase().includes('timeout')) {
          setError("Le chargement a pris trop de temps. Veuillez actualiser la page.");
        } else {
          setError("Impossible de charger les blocs de la page d'accueil.");
        }
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchBlocks();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderBlock = (block) => {
    if (block.block_type === 'html') {
      const sanitized = DOMPurify.sanitize(block.content || '');
      return (
        <div key={block.id} dangerouslySetInnerHTML={{ __html: sanitized }} />
      );
    }
    const Component = homeBlockRegistry[block.layout];
    if (!Component) return null;
    return <Component key={block.id} content={block.content} isPreview={false} />;
  };

  const renderedBlocks = useMemo(() => blocks.map(renderBlock).filter(Boolean), [blocks]);
  const hasBlocks = renderedBlocks.length > 0;
  const hasFooterBlock = useMemo(() => blocks.some(b => b.layout === 'global.footer'), [blocks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Chargement de la page d'accueil…</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>NotionLab - Formations Notion pour Entrepreneurs et Équipes</title>
        <meta name="description" content="Formations Notion professionnelles pour entrepreneurs, chefs d'entreprise et équipes. Maîtrisez Notion du niveau débutant à expert avec nos formations pratiques." />
        <meta property="og:title" content="NotionLab - Formations Notion pour Entrepreneurs et Équipes" />
        <meta property="og:description" content="Formations Notion professionnelles pour entrepreneurs, chefs d'entreprise et équipes. Maîtrisez Notion du niveau débutant à expert avec nos formations pratiques." />
      </Helmet>

      <div className="min-h-screen">
        {error ? (
          <div className="py-16 text-center text-destructive">{error}</div>
        ) : hasBlocks ? (
          <>
            {renderedBlocks}
            {!hasFooterBlock && <Footer />}
          </>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            Aucun bloc publié n'est disponible pour le moment.
          </div>
        )}
      </div>
    </>
  );
};

export default HomePage;