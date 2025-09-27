import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

import MainHeroSection from '@/components/home/MainHeroSection';
import SystemsShowcase from '@/components/home/SystemsShowcase';
import StatsSection from '@/components/home/StatsSection';
import FormationsSection from '@/components/home/FormationsSection';
import SupportSection from '@/components/home/SupportSection';
import PromiseSection from '@/components/home/PromiseSection';
import CozySpaceSection from '@/components/home/CozySpaceSection';
import PersonalQuoteSection from '@/components/home/PersonalQuoteSection';
import FinalCTA from '@/components/home/FinalCTA';
import LaunchCTA from '@/components/home/LaunchCTA';
import TubesCursorSection from '@/components/home/TubesCursorSection';
import Footer from '@/components/Footer';

const BlockPreview = ({ block, isOpen, onOpenChange }) => {
  if (!block) return null;

  const renderBlock = () => {
    if (!block.layout) {
      return <div>Type de bloc non reconnu ou layout manquant.</div>;
    }

    // Render raw HTML blocks regardless of layout support
    if (block.block_type === 'html') {
      return (
        <Card>
          <CardContent className="pt-6">
            <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
          </CardContent>
        </Card>
      );
    }

    const props = { content: block.content, isPreview: true };

    switch (block.layout) {
      case 'home.main_hero':
        return <MainHeroSection {...props} />;
      case 'home.systems_showcase':
        return <SystemsShowcase {...props} />;
      case 'home.stats':
        return <StatsSection {...props} />;
      case 'home.formations':
        return <FormationsSection {...props} />;
      case 'home.support':
        return <SupportSection {...props} />;
      case 'home.promise':
        return <PromiseSection {...props} />;
      case 'home.cozy_space':
        return <CozySpaceSection {...props} />;
      case 'home.personal_quote':
        return <PersonalQuoteSection {...props} />;
      case 'home.final_cta':
        return <FinalCTA {...props} />;
      case 'home.launch_cta':
        return <LaunchCTA {...props} />;
      case 'home.tubes_cursor':
        return <TubesCursorSection {...props} />;
      case 'global.footer':
        return <Footer {...props} isPreview={true} />;
      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold">Prévisualisation brute du contenu JSON :</h3>
              <pre className="mt-2 text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(block.content, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[800px] max-w-[90vw] p-0 border-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Prévisualisation du bloc : {block.title}</DialogTitle>
          <DialogDescription>
            Ceci est un aperçu de l'apparence du bloc sur votre site.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 bg-background">
          {isOpen ? renderBlock() : <Loader2 className="animate-spin" />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockPreview;