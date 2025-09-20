import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, PencilLine, Sparkles, AlertCircle } from 'lucide-react';

import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TrainingPreferencesSummary from '@/components/onboarding/TrainingPreferencesSummary';
import {
  fetchTrainingOnboardingConfigWithAllQuestions,
  fetchTrainingOnboardingResponse,
} from '@/lib/trainingOnboardingApi';

const TrainingPreferencesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;

  const configQuery = useQuery({
    queryKey: ['trainingOnboardingConfig', 'full'],
    queryFn: fetchTrainingOnboardingConfigWithAllQuestions,
  });

  const responseQuery = useQuery({
    queryKey: ['trainingOnboardingResponse', userId],
    queryFn: () => fetchTrainingOnboardingResponse(userId),
    enabled: Boolean(userId),
  });

  const isLoading = configQuery.isLoading || responseQuery.isLoading;
  const hasError = configQuery.isError || responseQuery.isError;

  const submittedAnswers = responseQuery.data?.submitted_answers || null;
  const draftAnswers = responseQuery.data?.draft_answers || null;
  const status = responseQuery.data?.status || null;
  const lastSubmittedAt = responseQuery.data?.last_submitted_at || null;
  const draftSavedAt = responseQuery.data?.draft_saved_at || null;

  const hasSummary = submittedAnswers && Object.keys(submittedAnswers).length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mes préférences de formation | NotionLab</title>
        <meta
          name="description"
          content="Consulte et mets à jour ton brief d'onboarding pour préparer ta formation NotionLab."
        />
      </Helmet>

      <div className="container max-w-5xl space-y-8 pb-16 pt-28">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Mes préférences de formation
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Ce résumé reprend les réponses partagées lors de l'onboarding. Mets-le à jour dès que ton contexte évolue :
            l’équipe NotionLab s’en servira pour préparer les sessions live.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/mes-preferences-formation/editer')}>
              <PencilLine className="mr-2 h-4 w-4" />
              Mettre à jour mes réponses
            </Button>
          </div>
        </header>

        {isLoading && (
          <div className="grid min-h-[40vh] place-items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        {hasError && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Impossible de charger ton résumé pour le moment. Vérifie ta connexion et réessaie dans quelques instants.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !hasError && !hasSummary && (
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Ton brief est encore vide</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Réponds au formulaire pour que la formation soit parfaitement alignée avec ton contexte et tes objectifs.
            </p>
            <div className="mt-6">
              <Button size="lg" onClick={() => navigate('/mes-preferences-formation/editer')}>
                Remplir les préférences
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !hasError && hasSummary && (
          <TrainingPreferencesSummary
            sections={configQuery.data}
            answers={submittedAnswers}
            status={status}
            lastSubmittedAt={lastSubmittedAt}
            draftSavedAt={draftAnswers ? draftSavedAt : null}
          />
        )}
      </div>
    </div>
  );
};

export default TrainingPreferencesPage;
