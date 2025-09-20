import React, { useMemo } from 'react';
import * as Icons from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formatMultiValue = (question, values = [], answers) => {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const optionMap = new Map((question.options || []).map((opt) => [opt.value, opt.label]));
  const otherKey = `${question.slug}__other`;
  const otherText = typeof answers?.[otherKey] === 'string' ? answers[otherKey].trim() : '';

  return values
    .map((value) => {
      if (value === 'autre' && otherText) {
        return `Autre - ${otherText}`;
      }
      const label = optionMap.get(value);
      return label || value;
    })
    .join(', ');
};

const formatSingleValue = (question, value, answers) => {
  if (!value) return null;
  const optionMap = new Map((question.options || []).map((opt) => [opt.value, opt.label]));
  if (value === 'autre') {
    const otherText = typeof answers?.[`${question.slug}__other`] === 'string'
      ? answers[`${question.slug}__other`].trim()
      : '';
    if (otherText) {
      return `Autre - ${otherText}`;
    }
  }
  return optionMap.get(value) || value;
};

const formatSliderValue = (question, value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const metadata = question.metadata || {};
  const labels = metadata.labels || {};
  const label = labels[String(value)];
  return label ? `${value} - ${label}` : `${value}`;
};

const buildSectionItems = (section, answers) => {
  return (section.questions || []).map((question) => {
    const value = answers?.[question.slug];
    let formatted;

    if (question.type === 'multi_choice' || question.allow_multiple) {
      formatted = formatMultiValue(question, value, answers);
    } else if (question.type === 'single_choice') {
      formatted = formatSingleValue(question, value, answers);
    } else if (question.type === 'slider') {
      formatted = formatSliderValue(question, value);
    } else if (question.type === 'text_short' || question.type === 'text_long') {
      const text = typeof value === 'string' ? value.trim() : '';
      formatted = text || null;
    } else if (value !== undefined && value !== null && value !== '') {
      formatted = String(value);
    } else {
      formatted = null;
    }

    return {
      id: question.id,
      label: question.label,
      value: formatted,
    };
  });
};

const TrainingPreferencesSummary = ({
  sections,
  answers,
  status,
  lastSubmittedAt,
  draftSavedAt,
  isAdminView = false,
}) => {
  const formattedSections = useMemo(() => {
    return (sections || []).map((section) => ({
      ...section,
      items: buildSectionItems(section, answers).filter((item) => item.value),
    }));
  }, [sections, answers]);

  const hasDraft =
    status === 'draft' && answers && lastSubmittedAt && draftSavedAt && new Date(draftSavedAt) > new Date(lastSubmittedAt);

  const formattedSubmittedAt = lastSubmittedAt
    ? new Date(lastSubmittedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="space-y-6">
      {hasDraft && (
        <Alert variant="warning">
          <AlertDescription>
            Des modifications sont en brouillon depuis le {new Date(draftSavedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}.
            Valide le formulaire pour partager les dernières réponses.
          </AlertDescription>
        </Alert>
      )}

      {formattedSubmittedAt && (
        <p className="text-sm text-muted-foreground">
          Dernière soumission le {formattedSubmittedAt}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {formattedSections.map((section) => {
          const Icon = Icons[section.icon] || Icons.FileText;
          const hasContent = section.items.length > 0;
          return (
            <Card key={section.id || section.slug} className="border-muted-foreground/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {hasContent ? (
                  <dl className="space-y-3">
                    {section.items.map((item) => (
                      <div
                        key={item.id || item.label}
                        className="rounded-md bg-muted/40 p-3"
                      >
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-line">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucune information communiquée.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TrainingPreferencesSummary;
