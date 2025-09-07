import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';

import MainHeroSection from '@/components/home/MainHeroSection';
import NextHeroSection from '@/components/home/NextHeroSection';
import QuoteSection from '@/components/home/QuoteSection';
import HeroSection from '@/components/home/HeroSection';
import SystemsShowcase from '@/components/home/SystemsShowcase';
import StatsSection from '@/components/home/StatsSection';
import FormationsSection from '@/components/home/FormationsSection';
import SupportSection from '@/components/home/SupportSection';
import PromiseSection from '@/components/home/PromiseSection';
import FinalCTA from '@/components/home/FinalCTA';
import LaunchCTA from '@/components/home/LaunchCTA';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import CozySpaceSection from '@/components/home/CozySpaceSection';
import PersonalQuoteSection from '@/components/home/PersonalQuoteSection';
import Footer from '@/components/Footer';

const HomePage = () => {
  const { user } = useAuth();

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlocks = async () => {
      setLoading(true);
      setError(null);
      try {
        // Récupère uniquement les blocs publiés dans l'ordre défini
        const { data, error } = await supabase
          .from('content_blocks')
          .select('*')
          .eq('status', 'published')
          .order('order_index', { ascending: true });

        if (error) throw error;
        setBlocks(data || []);
      } catch (err) {
        console.error('Error loading homepage blocks:', err);
        setError("Impossible de charger les blocs de la page d'accueil.");
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, []);

  const renderBlock = (block) => {
    // Fallback: render raw HTML blocks regardless of layout
    if (block.block_type === 'html') {
      return (
        <div key={block.id} dangerouslySetInnerHTML={{ __html: block.content || '' }} />
      );
    }
    const props = { content: block.content };
    switch (block.layout) {
      case 'home.main_hero':
        return <MainHeroSection key={block.id} {...props} />;
      case 'home.systems_showcase':
        return <SystemsShowcase key={block.id} {...props} />;
      case 'home.stats':
        return <StatsSection key={block.id} {...props} />;
      case 'home.formations':
        return <FormationsSection key={block.id} {...props} />;
      case 'home.support':
        return <SupportSection key={block.id} {...props} />;
      case 'home.promise':
        return <PromiseSection key={block.id} {...props} />;
      case 'home.cozy_space':
        return <CozySpaceSection key={block.id} {...props} />;
      case 'home.personal_quote':
        return <PersonalQuoteSection key={block.id} {...props} />;
      case 'home.final_cta':
        return <FinalCTA key={block.id} {...props} />;
      case 'home.launch_cta':
        return <LaunchCTA key={block.id} {...props} />;
      case 'global.footer':
        return <Footer key={block.id} {...props} isPreview={false} />;
      default:
        return null;
    }
  };

  const renderedBlocks = useMemo(() => blocks.map(renderBlock).filter(Boolean), [blocks]);
  const hasDynamicBlocks = renderedBlocks.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Chargement de la page d'accueil…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-destructive">{error}</span>
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
        {hasDynamicBlocks ? (
          renderedBlocks
        ) : (
          // Fallback: version statique actuelle si aucun bloc dynamique n'est configuré
          <>
            {!user && <MainHeroSection />}
            {!user && <NextHeroSection />} 
            {!user && <QuoteSection />}
            <HeroSection />
            <SystemsShowcase />
            <StatsSection />
            <FormationsSection />
            <SupportSection />
            <PromiseSection />
            <CozySpaceSection />
            <PersonalQuoteSection />
            <FinalCTA />
            <LaunchCTA />
          </>
        )}
      </div>
    </>
  );
};

export default HomePage;