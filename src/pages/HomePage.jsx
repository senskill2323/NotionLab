import React from 'react';
    import { Helmet } from 'react-helmet';

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

    const HomePage = () => {
      const { user } = useAuth();

      return (
        <>
          <Helmet>
            <title>NotionLab - Formations Notion pour Entrepreneurs et Équipes</title>
            <meta name="description" content="Formations Notion professionnelles pour entrepreneurs, chefs d'entreprise et équipes. Maîtrisez Notion du niveau débutant à expert avec nos formations pratiques." />
            <meta property="og:title" content="NotionLab - Formations Notion pour Entrepreneurs et Équipes" />
            <meta property="og:description" content="Formations Notion professionnelles pour entrepreneurs, chefs d'entreprise et équipes. Maîtrisez Notion du niveau débutant à expert avec nos formations pratiques." />
          </Helmet>

          <div className="min-h-screen">
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
          </div>
        </>
      );
    };

    export default HomePage;