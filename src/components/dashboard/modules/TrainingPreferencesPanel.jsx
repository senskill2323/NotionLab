import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Sparkles, AlertCircle, PencilLine } from 'lucide-react';

import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import TrainingPreferencesSummary from '@/components/onboarding/TrainingPreferencesSummary';
import {
  fetchTrainingOnboardingConfigWithAllQuestions,
  fetchTrainingOnboardingResponse,
} from '@/lib/trainingOnboardingApi';

const TrainingPreferencesPanel = () => {
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

  const submittedAnswers = responseQuery.data?.submitted_answers;
  const status = responseQuery.data?.status;
  const lastSubmittedAt = responseQuery.data?.last_submitted_at;
  const draftSavedAt = responseQuery.data?.draft_saved_at;

  return (
    <Card className="h-full border-muted-foreground/20">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Préférences de formation</CardTitle>
            <CardDescription>Un aperçu rapide du brief client.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/mes-preferences-formation/editer')}>
            <PencilLine className="mr-2 h-4 w-4" />
            Mettre à jour
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="grid min-h-[180px] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {hasError && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Impossible de charger le résumé pour le moment.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !hasError && !submittedAnswers && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-6 text-center text-sm text-muted-foreground">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            Complète ton brief pour personnaliser ta formation. Clique sur « Mettre à jour » pour commencer.
          </div>
        )}

        {!isLoading && !hasError && submittedAnswers && (
          <div className="max-h-[360px] space-y-4 overflow-y-auto pr-1">
            <TrainingPreferencesSummary
              sections={configQuery.data}
              answers={submittedAnswers}
              status={status}
              lastSubmittedAt={lastSubmittedAt}
              draftSavedAt={draftSavedAt}
              isAdminView={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingPreferencesPanel;
