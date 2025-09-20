import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import TrainingOnboardingWizard from '@/components/onboarding/TrainingOnboardingWizard';
import { Button } from '@/components/ui/button';

const TrainingPreferencesWizardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Formulaire d'onboarding | NotionLab</title>
        <meta
          name="description"
          content="Complète le brief de formation NotionLab pour que l'équipe adapte l'accompagnement à ton contexte."
        />
      </Helmet>

      <div className="container max-w-5xl space-y-8 pb-16 pt-28">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="w-fit"
            onClick={() => navigate('/mes-preferences-formation')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au résumé
          </Button>
          <p className="text-sm text-muted-foreground">
            Le formulaire se sauvegarde automatiquement après chaque réponse.
          </p>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Formulaire d'onboarding formation
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Réponds librement pour que l'équipe NotionLab puisse préparer une formation sur-mesure. Toutes les
            questions sont optionnelles. Tu peux revenir éditer tes réponses à tout moment.
          </p>
        </div>

        <TrainingOnboardingWizard onCompleted={() => navigate('/mes-preferences-formation')} />
      </div>
    </div>
  );
};

export default TrainingPreferencesWizardPage;
