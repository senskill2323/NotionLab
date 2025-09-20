import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import * as SliderPrimitive from '@radix-ui/react-slider';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  fetchTrainingOnboardingConfig,
  fetchTrainingOnboardingResponse,
  saveTrainingOnboardingDraft,
  submitTrainingOnboardingResponses,
  fetchTrainingOnboardingNps,
  recordTrainingOnboardingNps,
  notifyOnboardingSubmission,
} from '@/lib/trainingOnboardingApi';
import { supabase } from '@/lib/customSupabaseClient';

const sanitizeAnswersForSubmit = (answers, sections) => {
  const sanitized = {};
  if (!sections?.length) {
    return sanitized;
  }

  for (const section of sections) {
    for (const question of section.questions || []) {
      const { slug, type, allow_multiple, allow_other } = question;
      const rawValue = answers?.[slug];
      const otherKey = `${slug}__other`;
      const otherValue = typeof answers?.[otherKey] === 'string' ? answers[otherKey].trim() : '';

      if (type === 'multi_choice' || allow_multiple) {
        const arrayValue = Array.isArray(rawValue) ? rawValue.filter(Boolean) : [];
        sanitized[slug] = arrayValue;
        if (allow_other && arrayValue.includes('autre') && otherValue) {
          sanitized[otherKey] = otherValue;
        }
      } else if (type === 'single_choice') {
        if (rawValue) {
          sanitized[slug] = rawValue;
          if (allow_other && rawValue === 'autre' && otherValue) {
            sanitized[otherKey] = otherValue;
          }
        }
      } else if (type === 'slider') {
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
          sanitized[slug] = rawValue;
        }
      } else if (type === 'text_short' || type === 'text_long') {
        const trimmed = typeof rawValue === 'string' ? rawValue.trim() : '';
        if (trimmed) {
          sanitized[slug] = trimmed;
        }
      } else if (rawValue !== undefined) {
        sanitized[slug] = rawValue;
      }
    }
  }

  return sanitized;
};

const StepIndicator = ({ steps, currentStep, onStepChange }) => {
  return (
    <nav aria-label="Progression du formulaire" className="mb-8">
      <ol className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const status = isActive ? 'En cours' : isCompleted ? 'Terminé' : 'À venir';
          return (
            <li key={step.id}>
              <button
                type="button"
                className={clsx(
                  'flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring',
                  isActive && 'bg-primary text-primary-foreground shadow',
                  !isActive && 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                onClick={() => onStepChange(index)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${index + 1}. ${step.title} – ${status}`}
              >
                <span className={clsx(
                  'grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold',
                  isActive ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-muted-foreground/40'
                )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

const MultiChoiceCards = ({
  question,
  value = [],
  onToggle,
}) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(question.options || []).map((option) => {
        const selected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            className={clsx(
              'flex items-start gap-3 rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring',
              selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
            )}
            onClick={() => onToggle(option.value)}
            aria-pressed={selected}
          >
            <span className={clsx(
              'mt-1 h-4 w-4 rounded-full border',
              selected ? 'border-primary bg-primary shadow-inner' : 'border-muted-foreground/40'
            )} aria-hidden="true" />
            <span>
              <span className="font-medium leading-none text-sm">{option.label}</span>
              {option.description && (
                <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const SingleChoiceCards = ({ question, value, onSelect }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(question.options || []).map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={clsx(
              'flex items-start gap-3 rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring',
              selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
            )}
            onClick={() => onSelect(option.value)}
            aria-pressed={selected}
          >
            <span className={clsx(
              'mt-1 h-4 w-4 rounded-full border',
              selected ? 'border-primary bg-primary shadow-inner' : 'border-muted-foreground/40'
            )} aria-hidden="true" />
            <span>
              <span className="font-medium leading-none text-sm">{option.label}</span>
              {option.description && (
                <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const SliderQuestion = ({ question, value, onChange }) => {
  const metadata = question.metadata || {};
  const min = Number(metadata.min ?? 1);
  const max = Number(metadata.max ?? 5);
  const step = Number(metadata.step ?? 1);
  const clampedValue = typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
  const labels = metadata.labels || {};
  const currentLabel = labels?.[String(clampedValue)] ?? `${clampedValue}`;

  return (
    <div className="space-y-4">
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[clampedValue]}
        aria-label={question.label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clampedValue}
        aria-valuetext={currentLabel}
        onValueChange={(vals) => onChange(vals[0])}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border border-primary bg-background shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring" />
      </SliderPrimitive.Root>
      {labels && Object.keys(labels).length > 0 && (
        <div className="grid grid-cols-5 text-xs text-muted-foreground">
          {Array.from({ length: max - min + 1 }, (_, idx) => min + idx).map((level) => (
            <span key={level} className={clsx('text-center', level === clampedValue && 'font-semibold text-foreground')}>
              {labels[String(level)] ?? level}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const QuestionBlock = ({ question, answers, onChange }) => {
  const helperId = React.useId();
  const otherKey = `${question.slug}__other`;
  const value = answers?.[question.slug];
  const otherValue = answers?.[otherKey] ?? '';
  const showOtherField = question.allow_other && (
    (Array.isArray(value) && value.includes('autre')) || value === 'autre'
  );

  const handleToggle = (optionValue) => {
    if (question.type === 'multi_choice' || question.allow_multiple) {
      onChange((prev) => {
        const current = Array.isArray(prev?.[question.slug]) ? [...prev[question.slug]] : [];
        const hasValue = current.includes(optionValue);
        let nextValues;
        if (hasValue) {
          nextValues = current.filter((item) => item !== optionValue);
        } else {
          nextValues = [...current, optionValue];
        }

        if (optionValue === 'aucun' && !hasValue) {
          nextValues = ['aucun'];
        } else if (optionValue !== 'aucun' && nextValues.includes('aucun')) {
          nextValues = nextValues.filter((item) => item !== 'aucun');
        }

        const nextAnswers = { ...prev, [question.slug]: nextValues };
        if (!nextValues.includes('autre')) {
          delete nextAnswers[otherKey];
        }
        return nextAnswers;
      });
    } else {
      onChange((prev) => {
        const nextAnswers = { ...prev, [question.slug]: optionValue };
        if (optionValue !== 'autre') {
          delete nextAnswers[otherKey];
        }
        return nextAnswers;
      });
    }
  };

  return (
    <fieldset className="space-y-4" aria-describedby={question.helper_text ? helperId : undefined}>
      <legend className="text-base font-semibold text-foreground">{question.label}</legend>
      {question.helper_text && (
        <p id={helperId} className="text-sm text-muted-foreground">
          {question.helper_text}
        </p>
      )}

      {question.type === 'multi_choice' || question.allow_multiple ? (
        <MultiChoiceCards
          question={question}
          value={Array.isArray(value) ? value : []}
          onToggle={handleToggle}
        />
      ) : question.type === 'single_choice' ? (
        <SingleChoiceCards
          question={question}
          value={typeof value === 'string' ? value : ''}
          onSelect={handleToggle}
        />
      ) : question.type === 'slider' ? (
        <SliderQuestion
          question={question}
          value={typeof value === 'number' ? value : undefined}
          onChange={(nextValue) => onChange(question.slug, () => nextValue)}
        />
      ) : question.type === 'text_long' ? (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(question.slug, () => event.target.value)}
          placeholder={question.placeholder || ''}
          className="min-h-[120px]"
        />
      ) : (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(question.slug, () => event.target.value)}
          placeholder={question.placeholder || ''}
        />
      )}

      {showOtherField && (
        <div className="space-y-2">
          <Label htmlFor={`other-${question.slug}`} className="text-sm font-medium">
            {question.other_label || 'Autre'}
          </Label>
          <Input
            id={`other-${question.slug}`}
            value={otherValue}
            onChange={(event) => onChange(otherKey, () => event.target.value)}
            placeholder={question.other_placeholder || 'Précise ta réponse'}
          />
        </div>
      )}
    </fieldset>
  );
};

const NpsDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}) => {
  const [choice, setChoice] = useState('');
  const [comment, setComment] = useState('');
  const [hasThanked, setHasThanked] = useState(false);

  useEffect(() => {
    if (!open) {
      setChoice('');
      setComment('');
      setHasThanked(false);
    }
  }, [open]);

  const handleValidate = async () => {
    try {
      await onSubmit({ value: choice === 'oui', comment });
      setHasThanked(true);
    } catch (_) {
      // gestion de l'erreur d?j? prise en charge par l'appelant
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Le formulaire t’a semblé clair ?</DialogTitle>
          <DialogDescription>
            Merci pour ton retour rapide, cela nous aide à améliorer l’expérience.
          </DialogDescription>
        </DialogHeader>

        {hasThanked ? (
          <div className="py-8 text-center text-sm">
            <p className="font-medium text-foreground">Merci pour ton retour ! 🙂</p>
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={choice} onValueChange={setChoice} className="flex gap-3">
              <Label
                htmlFor="nps-oui"
                className={clsx(
                  'flex-1 cursor-pointer rounded-lg border p-4 text-center text-sm transition-all',
                  choice === 'oui' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                )}
              >
                <RadioGroupItem id="nps-oui" value="oui" className="sr-only" />
                Oui
              </Label>
              <Label
                htmlFor="nps-non"
                className={clsx(
                  'flex-1 cursor-pointer rounded-lg border p-4 text-center text-sm transition-all',
                  choice === 'non' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                )}
              >
                <RadioGroupItem id="nps-non" value="non" className="sr-only" />
                Non
              </Label>
            </RadioGroup>

            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Un mot pour préciser ton ressenti (optionnel)"
            />
          </div>
        )}

        <DialogFooter className="mt-4">
          {hasThanked ? (
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Plus tard
              </Button>
              <Button
                onClick={handleValidate}
                disabled={!choice || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Envoyer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TrainingOnboardingWizard = ({ onCompleted }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userId = user?.id;
  const defaultCompletion = React.useCallback(() => navigate('/mes-preferences-formation'), [navigate]);
  const completeWizard = onCompleted || defaultCompletion;

  const configQuery = useQuery({
    queryKey: ['trainingOnboardingConfig'],
    queryFn: () => fetchTrainingOnboardingConfig({ includeInactive: false }),
  });

  const responseQuery = useQuery({
    queryKey: ['trainingOnboardingResponse', userId],
    queryFn: () => fetchTrainingOnboardingResponse(userId),
    enabled: Boolean(userId),
  });

  const npsQuery = useQuery({
    queryKey: ['trainingOnboardingNps', userId],
    queryFn: () => fetchTrainingOnboardingNps(userId),
    enabled: Boolean(userId),
  });

  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [saveState, setSaveState] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showNpsDialog, setShowNpsDialog] = useState(false);
  const [pendingRedirectAfterNps, setPendingRedirectAfterNps] = useState(false);

  const latestResponseRef = useRef(responseQuery.data ?? null);
  const lastSavedPayloadRef = useRef(null);
  const hasHydratedInitialRef = useRef(false);

  const sections = configQuery.data || [];
  const steps = useMemo(() => {
    return sections
      .map((section) => ({
        id: section.slug,
        title: section.title,
        description: section.description,
        questions: (section.questions || []).filter((question) => question.is_active),
      }))
      .filter((section) => section.questions.length > 0);
  }, [sections]);

  useEffect(() => {
    if (steps.length > 0 && currentStep >= steps.length) {
      setCurrentStep(steps.length - 1);
    }
  }, [steps.length, currentStep]);

  useEffect(() => {
    if (!responseQuery.isFetched) return;
    const base = responseQuery.data?.draft_answers ?? responseQuery.data?.submitted_answers ?? {};
    setAnswers(base || {});
    lastSavedPayloadRef.current = JSON.stringify(base || {});
    if (responseQuery.data?.draft_saved_at) {
      setLastSavedAt(responseQuery.data.draft_saved_at);
    }
    latestResponseRef.current = responseQuery.data ?? null;
    hasHydratedInitialRef.current = true;
  }, [responseQuery.data, responseQuery.isFetched]);

  const [debouncedAnswers] = useDebounce(answers, 600);

  const saveDraftMutation = useMutation({
    mutationFn: ({ userId: targetUserId, draft }) =>
      saveTrainingOnboardingDraft({ userId: targetUserId, draftAnswers: draft, markDirty: true }),
    onMutate: () => {
      setSaveState('saving');
    },
    onSuccess: (data, variables) => {
      setSaveState('saved');
      if (data?.draft_saved_at) {
        setLastSavedAt(data.draft_saved_at);
      } else {
        setLastSavedAt(new Date().toISOString());
      }
      if (variables?.userId) {
        queryClient.setQueryData(['trainingOnboardingResponse', variables.userId], data);
      }
    },
    onError: () => {
      setSaveState('error');
      toast({
        title: 'Autosauvegarde impossible',
        description: 'Vérifie ta connexion et réessaie.',
        variant: 'destructive',
      });
      lastSavedPayloadRef.current = null;
    },
  });

  useEffect(() => {
    if (!userId) return;
    if (!hasHydratedInitialRef.current) return;
    const serialized = JSON.stringify(debouncedAnswers || {});
    if (serialized === lastSavedPayloadRef.current) return;
    lastSavedPayloadRef.current = serialized;
    saveDraftMutation.mutate({ userId, draft: debouncedAnswers || {} });
  }, [debouncedAnswers, userId, saveDraftMutation]);

  const handleChangeAnswer = (slugOrUpdater, maybeUpdater) => {
    if (typeof slugOrUpdater === 'function' && typeof maybeUpdater === 'undefined') {
      setAnswers((prev) => {
        const next = slugOrUpdater(prev);
        return next === undefined ? prev : next;
      });
      return;
    }

    const slug = slugOrUpdater;
    const updater = maybeUpdater;
    setAnswers((prev) => {
      const previousValue = prev?.[slug];
      const nextValue = typeof updater === 'function' ? updater(previousValue) : updater;
      if (nextValue === undefined) {
        const clone = { ...prev };
        delete clone[slug];
        return clone;
      }
      return {
        ...prev,
        [slug]: nextValue,
      };
    });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const prepared = sanitizeAnswersForSubmit(answers, sections);
      const { response, isFirstSubmission } = await submitTrainingOnboardingResponses({
        userId,
        draftAnswers: prepared,
        existingResponse: responseQuery.data,
      });

      const professionValue = prepared.metier_activite;
      if (professionValue && professionValue !== user?.profile?.profession) {
        await supabase
          .from('profiles')
          .update({ profession: professionValue })
          .eq('id', userId);
      }

      return { response, prepared, isFirstSubmission };
    },
    onSuccess: async ({ response, prepared, isFirstSubmission }) => {
      setAnswers(prepared);
      lastSavedPayloadRef.current = JSON.stringify(prepared || {});
      setSaveState('saved');
      if (response?.draft_saved_at) {
        setLastSavedAt(response.draft_saved_at);
      }
      queryClient.setQueryData(['trainingOnboardingResponse', userId], response);
      latestResponseRef.current = response ?? null;
      notifyOnboardingSubmission({
        userId,
        userName: user?.profile?.full_name || user?.profile?.pseudo || user?.email || 'Client',
        userEmail: user?.email || null,
        isFirstSubmission,
        sections,
        answers: prepared,
      });
      toast({
        title: 'Préférences enregistrées',
        description: 'Ton brief est bien envoyé !',
      });

      if (isFirstSubmission && !npsQuery.data) {
        setPendingRedirectAfterNps(true);
        setShowNpsDialog(true);
      } else {
        setPendingRedirectAfterNps(false);
        completeWizard();
      }
    },
    onError: () => {
      toast({
        title: 'Enregistrement impossible',
        description: 'La soumission a échoué. Vérifie la connexion et réessaie.',
        variant: 'destructive',
      });
    },
  });

  const npsMutation = useMutation({
    mutationFn: ({ value, comment }) => {
      const responseId = latestResponseRef.current?.id;
      if (!responseId) {
        throw new Error('Response manquante pour enregistrer le NPS.');
      }
      return recordTrainingOnboardingNps({
        responseId,
        userId,
        answer: value,
        comment,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['trainingOnboardingNps', userId], data);
      setTimeout(() => {
        setShowNpsDialog(false);
        if (pendingRedirectAfterNps) {
          setPendingRedirectAfterNps(false);
          completeWizard();
        }
      }, 500);
    },
    onError: () => {
      toast({
        title: 'Envoi impossible',
        description: 'Ton avis n’a pas pu être enregistré. Réessaie plus tard.',
        variant: 'destructive',
      });
    },
  });

  const isLoading = configQuery.isLoading || responseQuery.isLoading;
  const hasError = configQuery.isError || responseQuery.isError;

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 text-destructive" />
          <div className="space-y-2">
            <p className="font-semibold text-destructive">Impossible de charger le formulaire.</p>
            <p className="text-sm text-muted-foreground">
              Vérifie ta connexion internet puis réessaie.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                configQuery.refetch();
                responseQuery.refetch();
              }}
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!steps.length) {
    return (
      <div className="rounded-lg border border-muted p-6 text-center text-sm text-muted-foreground">
        Aucune question n'est disponible pour le moment.
      </div>
    );
  }

  const currentSection = steps[currentStep];

  const saveMessage = saveState === 'saving'
    ? 'Enregistrement du brouillon...'
    : saveState === 'saved' && lastSavedAt
      ? `Brouillon enregistré à ${new Date(lastSavedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      : saveState === 'error'
        ? 'Erreur lors de l’enregistrement.'
        : 'Autosauvegarde prête';

  return (
    <div className="space-y-8">
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
      />

      <Card className="border-muted-foreground/20">
        <CardContent className="space-y-8 p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="text-sm text-muted-foreground">{currentSection.description}</p>
            )}
          </div>

          <div className="space-y-8">
            {(currentSection.questions || []).map((question) => (
              <QuestionBlock
                key={question.id}
                question={question}
                answers={answers}
                onChange={(slug, updater) => handleChangeAnswer(slug, updater)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 border-t border-dashed border-muted pt-6">
            <div aria-live="polite" className="text-sm text-muted-foreground flex items-center gap-2">
              {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saveMessage}</span>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
                  disabled={currentStep === steps.length - 1}
                >
                  Suivant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {currentStep === steps.length - 1 && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Valider mes réponses
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Tes réponses sont visibles par toi et par l’équipe NotionLab. N’ajoute pas de données sensibles.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <NpsDialog
        open={showNpsDialog}
        onOpenChange={(next) => {
          setShowNpsDialog(next);
          if (!next && pendingRedirectAfterNps) {
            setPendingRedirectAfterNps(false);
            completeWizard();
          }
        }}
        onSubmit={({ value, comment }) => npsMutation.mutateAsync({ value, comment })}
        isSubmitting={npsMutation.isPending}
      />
    </div>
  );
};

export default TrainingOnboardingWizard;
