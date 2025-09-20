import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Edit3, Settings2 } from 'lucide-react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  fetchTrainingOnboardingConfigWithAllQuestions,
} from '@/lib/trainingOnboardingApi';

const QuestionEditorDialog = ({ question, open, onOpenChange, onSubmit }) => {
  const [formState, setFormState] = useState({
    label: question?.label || '',
    helper_text: question?.helper_text || '',
    placeholder: question?.placeholder || '',
    sort_order: question?.sort_order ?? 0,
    allow_other: question?.allow_other ?? false,
    other_label: question?.other_label || '',
    other_placeholder: question?.other_placeholder || '',
  });

  React.useEffect(() => {
    if (!open) return;
    setFormState({
      label: question?.label || '',
      helper_text: question?.helper_text || '',
      placeholder: question?.placeholder || '',
      sort_order: question?.sort_order ?? 0,
      allow_other: question?.allow_other ?? false,
      other_label: question?.other_label || '',
      other_placeholder: question?.other_placeholder || '',
    });
  }, [question, open]);

  const handleChange = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formState);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Modifier la question</DialogTitle>
            <DialogDescription>
              Ajuste le libellé ou l'ordre d'affichage. Les changements sont visibles immédiatement dans le formulaire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Libellé
              <Input
                value={formState.label}
                onChange={(event) => handleChange('label', event.target.value)}
                required
                className="mt-1"
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Texte d'aide (optionnel)
              <Textarea
                value={formState.helper_text}
                onChange={(event) => handleChange('helper_text', event.target.value)}
                className="mt-1"
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Placeholder (optionnel)
              <Input
                value={formState.placeholder}
                onChange={(event) => handleChange('placeholder', event.target.value)}
                className="mt-1"
              />
            </label>

            <label className="flex items-center justify-between rounded-md border bg-muted/30 p-3 text-sm">
              <span>Autoriser le champ « Autre » ?</span>
              <Switch
                checked={formState.allow_other}
                onCheckedChange={(checked) => handleChange('allow_other', checked)}
              />
            </label>

            {formState.allow_other && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-foreground">
                  Libellé pour « Autre »
                  <Input
                    value={formState.other_label}
                    onChange={(event) => handleChange('other_label', event.target.value)}
                    className="mt-1"
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Placeholder du champ libre
                  <Input
                    value={formState.other_placeholder}
                    onChange={(event) => handleChange('other_placeholder', event.target.value)}
                    className="mt-1"
                  />
                </label>
              </div>
            )}

            <label className="block text-sm font-medium text-foreground">
              Ordre d'affichage
              <Input
                type="number"
                value={formState.sort_order}
                onChange={(event) => handleChange('sort_order', Number(event.target.value))}
                className="mt-1"
              />
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const OptionsManager = ({ questionId, options, onChange }) => {
  const [editingStates, setEditingStates] = useState(() => {
    const state = new Map();
    (options || []).forEach((option) => {
      state.set(option.id, {
        label: option.label,
        sort_order: option.sort_order ?? 0,
        is_active: option.is_active ?? true,
      });
    });
    return state;
  });

  const [newOption, setNewOption] = useState({ value: '', label: '', sort_order: 0 });

  React.useEffect(() => {
    const state = new Map();
    (options || []).forEach((option) => {
      state.set(option.id, {
        label: option.label,
        sort_order: option.sort_order ?? 0,
        is_active: option.is_active ?? true,
      });
    });
    setEditingStates(state);
  }, [options]);

  const handleFieldChange = (optionId, field, value) => {
    setEditingStates((prev) => {
      const next = new Map(prev);
      const current = next.get(optionId) || {};
      next.set(optionId, { ...current, [field]: value });
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {(options || []).map((option) => {
          const state = editingStates.get(option.id);
          return (
            <div key={option.id} className="rounded-md border border-muted-foreground/30 bg-muted/20 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">Valeur: <span className="font-mono">{option.value}</span></p>
                  <Input
                    value={state?.label || ''}
                    onChange={(event) => handleFieldChange(option.id, 'label', event.target.value)}
                    placeholder="Libellé affiché"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">
                    Ordre
                    <Input
                      type="number"
                      value={state?.sort_order ?? 0}
                      onChange={(event) => handleFieldChange(option.id, 'sort_order', Number(event.target.value))}
                      className="mt-1 w-20"
                    />
                  </label>
                  <div className="flex flex-col items-center gap-1 text-xs">
                    <span>Actif</span>
                    <Switch
                      checked={state?.is_active ?? true}
                      onCheckedChange={(checked) => handleFieldChange(option.id, 'is_active', checked)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onChange('update', option.id, state)}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          value={newOption.value}
          onChange={(event) => setNewOption((prev) => ({ ...prev, value: event.target.value }))}
          placeholder="Valeur interne"
        />
        <Input
          value={newOption.label}
          onChange={(event) => setNewOption((prev) => ({ ...prev, label: event.target.value }))}
          placeholder="Libellé affiché"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={newOption.sort_order}
            onChange={(event) => setNewOption((prev) => ({ ...prev, sort_order: Number(event.target.value) }))}
            className="w-24"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!newOption.value || !newOption.label) return;
              onChange('insert', null, newOption);
              setNewOption({ value: '', label: '', sort_order: 0 });
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
};

const OnboardingQuestionsAdminPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [questionToEdit, setQuestionToEdit] = useState(null);
  const [optionsQuestionId, setOptionsQuestionId] = useState(null);

  const configQuery = useQuery({
    queryKey: ['trainingOnboardingConfig', 'full'],
    queryFn: fetchTrainingOnboardingConfigWithAllQuestions,
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, changes }) =>
      supabase
        .from('training_onboarding_questions')
        .update(changes)
        .eq('id', id)
        .throwOnError(),
    onSuccess: () => {
      toast({ title: 'Question mise à jour' });
      queryClient.invalidateQueries(['trainingOnboardingConfig', 'full']);
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: ({ id, changes }) =>
      supabase
        .from('training_onboarding_question_options')
        .update(changes)
        .eq('id', id)
        .throwOnError(),
    onSuccess: () => {
      toast({ title: 'Option mise à jour' });
      queryClient.invalidateQueries(['trainingOnboardingConfig', 'full']);
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const insertOptionMutation = useMutation({
    mutationFn: ({ questionId, payload }) =>
      supabase
        .from('training_onboarding_question_options')
        .insert({
          question_id: questionId,
          value: payload.value,
          label: payload.label,
          sort_order: payload.sort_order ?? 0,
          is_active: true,
        })
        .throwOnError(),
    onSuccess: () => {
      toast({ title: 'Option ajoutée' });
      queryClient.invalidateQueries(['trainingOnboardingConfig', 'full']);
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const sections = useMemo(() => {
    const data = configQuery.data || [];
    return data.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
  }, [configQuery.data]);

  return (
    <div className="space-y-6">
      <Card className="border-muted-foreground/30">
        <CardHeader>
          <CardTitle>Questions du formulaire d'onboarding</CardTitle>
          <CardDescription>
            Active ou ajuste les questions et leurs options sans intervention technique. Les modifications sont appliquées immédiatement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configQuery.isLoading && (
            <div className="grid min-h-[200px] place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {configQuery.isError && !configQuery.isLoading && (
            <Alert variant="destructive">
              <AlertDescription>
                Impossible de charger la configuration actuelle du formulaire.
              </AlertDescription>
            </Alert>
          )}

          {!configQuery.isLoading && !configQuery.isError && sections.map((section) => (
            <div key={section.id || section.slug} className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                {section.description && (
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                )}
              </div>
              <div className="space-y-3">
                {(section.questions || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((question) => (
                  <div key={question.id} className="rounded-lg border border-muted-foreground/30 bg-muted/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{question.label}</p>
                        <p className="text-xs text-muted-foreground uppercase">{question.type}</p>
                        <p className="text-xs text-muted-foreground">Ordre d'affichage : {question.sort_order}</p>
                        {question.helper_text && (
                          <p className="text-xs text-muted-foreground">Aide : {question.helper_text}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={question.is_active}
                          onCheckedChange={(checked) => updateQuestionMutation.mutate({ id: question.id, changes: { is_active: checked } })}
                        />
                        <span className="text-xs text-muted-foreground">Actif</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setQuestionToEdit(question)}
                        >
                          <Edit3 className="mr-1 h-4 w-4" />
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setOptionsQuestionId((prev) => (prev === question.id ? null : question.id))}
                        >
                          <Settings2 className="mr-1 h-4 w-4" />
                          Options
                        </Button>
                      </div>
                    </div>
                    {optionsQuestionId === question.id && (
                      <div className="mt-4 space-y-3">
                        <Separator />
                        <OptionsManager
                          questionId={question.id}
                          options={(question.options || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))}
                          onChange={(action, optionId, payload) => {
                            if (action === 'update') {
                              updateOptionMutation.mutate({ id: optionId, changes: payload });
                            } else if (action === 'insert') {
                              insertOptionMutation.mutate({ questionId: question.id, payload });
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <QuestionEditorDialog
        question={questionToEdit}
        open={Boolean(questionToEdit)}
        onOpenChange={(open) => {
          if (!open) setQuestionToEdit(null);
        }}
        onSubmit={(changes) => {
          if (!questionToEdit) return;
          updateQuestionMutation.mutate({
            id: questionToEdit.id,
            changes,
          });
          setQuestionToEdit(null);
        }}
      />
    </div>
  );
};

export default OnboardingQuestionsAdminPanel;
