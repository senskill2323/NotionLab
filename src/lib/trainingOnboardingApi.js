import { supabase } from '@/lib/customSupabaseClient';

const SECTION_SELECT = `
  id,
  slug,
  title,
  description,
  icon,
  step_order,
  questions:training_onboarding_questions (
    id,
    section_id,
    slug,
    label,
    description,
    helper_text,
    placeholder,
    type,
    allow_multiple,
    allow_other,
    other_label,
    other_placeholder,
    is_required,
    is_active,
    sort_order,
    metadata,
    options:training_onboarding_question_options (
      id,
      question_id,
      value,
      label,
      description,
      sort_order,
      is_active
    )
  )
`;

const RESPONSE_COLUMNS = `
  id,
  user_id,
  draft_answers,
  submitted_answers,
  status,
  draft_saved_at,
  first_submitted_at,
  last_submitted_at
`;

const NPS_COLUMNS = `
  id,
  response_id,
  user_id,
  answer,
  comment,
  created_at
`;

const normalizeResponse = (row) => {
  if (!row) return null;
  return {
    ...row,
    draft_answers: row.draft_answers ?? {},
    submitted_answers: row.submitted_answers ?? null,
  };
};
const formatValueForEmail = (question, answers) => {
  const value = answers?.[question.slug];
  const otherKey = `${question.slug}__other`;
  const otherText = typeof answers?.[otherKey] === 'string' ? answers[otherKey].trim() : '';

  if (question.type === 'multi_choice' || question.allow_multiple) {
    const arrayValue = Array.isArray(value) ? value.filter(Boolean) : [];
    if (!arrayValue.length) return null;
    const labelMap = new Map((question.options || []).map((opt) => [opt.value, opt.label]));
    return arrayValue
      .map((item) => {
        if (item === 'autre' && otherText) {
          return `Autre - ${otherText}`;
        }
        return labelMap.get(item) || item;
      })
      .join(', ');
  }

  if (question.type === 'single_choice') {
    if (!value) return null;
    if (value === 'autre' && otherText) {
      return `Autre - ${otherText}`;
    }
    const labelMap = new Map((question.options || []).map((opt) => [opt.value, opt.label]));
    return labelMap.get(value) || value;
  }

  if (question.type === 'slider') {
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    const metadata = question.metadata || {};
    const labels = metadata.labels || {};
    const label = labels[String(value)];
    return label ? `${value} - ${label}` : String(value);
  }

  if (question.type === 'text_short' || question.type === 'text_long') {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || null;
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value);
};

const buildEmailSummary = (sections, answers) => {
  const blocks = [];
  (sections || []).forEach((section) => {
    const lines = [];
    (section.questions || []).forEach((question) => {
      const formatted = formatValueForEmail(question, answers);
      if (formatted) {
        lines.push(`- ${question.label}: ${formatted}`);
      }
    });
    if (lines.length) {
      blocks.push(`${section.title}
${lines.join('\n')}`);
    }
  });
  return blocks.join('\n\n');
};


export async function fetchTrainingOnboardingConfig({ includeInactive = true } = {}) {
  const { data, error } = await supabase
    .from('training_onboarding_sections')
    .select(SECTION_SELECT)
    .order('step_order', { ascending: true })
    .order('sort_order', { referencedTable: 'training_onboarding_questions', ascending: true })
    .order('sort_order', { referencedTable: 'training_onboarding_questions.training_onboarding_question_options', ascending: true })
    .throwOnError();

  const sections = (data || []).map((section) => {
    const activeQuestions = (section.questions || [])
      .map((question) => ({
        ...question,
        options: (question.options || [])
          .filter((option) => includeInactive || option.is_active)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))
      .filter((question) => includeInactive || question.is_active);

    return {
      ...section,
      questions: activeQuestions,
    };
  });

  return sections;
}

export async function fetchTrainingOnboardingResponse(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('training_onboarding_responses')
    .select(RESPONSE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return normalizeResponse(data);
}

export async function saveTrainingOnboardingDraft({ userId, draftAnswers, markDirty = true }) {
  if (!userId) {
    throw new Error('userId is required to save the onboarding draft.');
  }

  const nowIso = new Date().toISOString();
  const payload = {
    user_id: userId,
    draft_answers: draftAnswers ?? {},
    draft_saved_at: nowIso,
  };

  if (markDirty) {
    payload.status = 'draft';
  }

  const query = supabase
    .from('training_onboarding_responses')
    .upsert(payload, { onConflict: 'user_id' })
    .select(RESPONSE_COLUMNS)
    .maybeSingle();

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return normalizeResponse(data);
}

export async function submitTrainingOnboardingResponses({ userId, draftAnswers, existingResponse }) {
  if (!userId) {
    throw new Error('userId is required to submit onboarding answers.');
  }

  const nowIso = new Date().toISOString();
  const firstSubmittedAt = existingResponse?.first_submitted_at ?? nowIso;

  const payload = {
    user_id: userId,
    draft_answers: draftAnswers ?? {},
    submitted_answers: draftAnswers ?? {},
    status: 'submitted',
    draft_saved_at: nowIso,
    last_submitted_at: nowIso,
    first_submitted_at: firstSubmittedAt,
  };

  const { data, error } = await supabase
    .from('training_onboarding_responses')
    .upsert(payload, { onConflict: 'user_id' })
    .select(RESPONSE_COLUMNS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const response = normalizeResponse(data);
  return {
    response,
    isFirstSubmission: !existingResponse?.first_submitted_at,
  };
}

export async function fetchTrainingOnboardingSummary(userId) {
  return fetchTrainingOnboardingResponse(userId);
}

export async function fetchTrainingOnboardingNps(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('training_onboarding_nps')
    .select(NPS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data ?? null;
}

export async function recordTrainingOnboardingNps({ responseId, userId, answer, comment }) {
  if (!responseId || !userId) {
    throw new Error('responseId and userId are required to save the NPS answer.');
  }

  const payload = {
    response_id: responseId,
    user_id: userId,
    answer,
    comment: comment ? comment.trim() : null,
  };

  const { data, error } = await supabase
    .from('training_onboarding_nps')
    .upsert(payload, { onConflict: 'response_id' })
    .select(NPS_COLUMNS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchTrainingOnboardingConfigWithAllQuestions() {
  const { data, error } = await supabase
    .from('training_onboarding_sections')
    .select(SECTION_SELECT)
    .order('step_order', { ascending: true })
    .order('sort_order', { referencedTable: 'training_onboarding_questions', ascending: true })
    .order('sort_order', { referencedTable: 'training_onboarding_questions.training_onboarding_question_options', ascending: true })
    .throwOnError();

  return (data || []).map((section) => ({
    ...section,
    questions: (section.questions || []).map((question) => ({
      ...question,
      options: (question.options || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    })),
  }));
}

export async function notifyOnboardingSubmission({ userId, userName, userEmail, isFirstSubmission, sections, answers }) {
  try {
    const summary = buildEmailSummary(sections, answers);
    await supabase.functions.invoke('notify-training-onboarding', {
      body: {
        userId,
        userName,
        userEmail,
        isFirstSubmission,
        summary,
      },
    });
  } catch (error) {
    console.warn('notify-training-onboarding failed:', error?.message || error);
  }
}

