import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ClipboardList } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TrainingPreferencesSummary from '@/components/onboarding/TrainingPreferencesSummary';
import {
  fetchTrainingOnboardingConfigWithAllQuestions,
  fetchTrainingOnboardingResponse,
} from '@/lib/trainingOnboardingApi';

const OnboardingBriefPanel = ({ userId }) => {
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

  return (
    <Card className="border-muted-foreground/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base">Brief & Profil</CardTitle>
            <CardDescription>
              Synthèse des préférences partagées par le client lors de l'onboarding formation.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="grid min-h-[160px] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {hasError && !isLoading && (
          <Alert variant="destructive">
            <AlertDescription>
              Impossible de récupérer le brief d'onboarding pour ce client.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !hasError && !submittedAnswers && (
          <Alert variant="secondary">
            <AlertDescription>
              Ce client n'a pas encore validé le formulaire d'onboarding.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !hasError && submittedAnswers && (
          <TrainingPreferencesSummary
            sections={configQuery.data}
            answers={submittedAnswers}
            status={responseQuery.data?.status}
            lastSubmittedAt={responseQuery.data?.last_submitted_at}
            draftSavedAt={responseQuery.data?.draft_saved_at}
            isAdminView
          />
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingBriefPanel;
