import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, RotateCcw, Bot } from 'lucide-react';
const TONE_OPTIONS = [
  { value: 'neutral', label: 'Neutre' },
  { value: 'friendly', label: 'Chaleureux' },
  { value: 'professional', label: 'Professionnel' },
  { value: 'empathetic', label: 'Empathique' },
];

const LANGUAGE_OPTIONS = [
  { value: 'fr-FR', label: 'Français' },
  { value: 'en-US', label: 'Anglais (US)' },
  { value: 'en-GB', label: 'Anglais (UK)' },
  { value: 'es-ES', label: 'Espagnol' },
  { value: 'de-DE', label: 'Allemand' },
];

const VERBOSITY_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Équilibrée' },
  { value: 'detailed', label: 'Détaillée' },
];

const HISTORY_TRUNCATION_OPTIONS = [
  { value: 'last', label: 'Les derniers messages' },
  { value: 'first', label: 'Supprimer les premiers' },
  { value: 'semantic', label: 'Troncature sémantique' },
];
const VOICE_OPTIONS = [
  { value: 'verse', label: 'Verse' },
  { value: 'alloy', label: 'Alloy' },
  { value: 'aria', label: 'Aria' },
  { value: 'sage', label: 'Sage' },
];

const OUTPUT_AUDIO_FORMAT_OPTIONS = [
  { value: 'none', label: 'Aucun' },
  { value: 'wav', label: 'WAV' },
  { value: 'mp3', label: 'MP3' },
  { value: 'ogg', label: 'OGG' },
  { value: 'pcm16', label: 'PCM16' },
];

const TOOL_OPTIONS = [
  { value: 'knowledge_base', label: 'Base de connaissances' },
  { value: 'code_interpreter', label: 'Interpréteur de code' },
  { value: 'web_search', label: 'Recherche web' },
  { value: 'actions', label: 'Actions personnalisées' },
];

const UI_HANDOFF_OPTIONS = [
  { value: 'manual', label: 'Manuelle' },
  { value: 'auto', label: 'Automatique' },
  { value: 'hybrid', label: 'Hybride' },
];
const DEFAULT_VALUES = {
  system_prompt: '',
  tone: 'neutral',
  language_preference: 'fr-FR',
  verbosity: 'balanced',
  temperature: 0.7,
  top_p: 0.9,
  max_output_tokens: 8192,
  json_mode: false,
  modalities: { text: true, audio_in: true, audio_out: true, vision: false },
  voice: 'verse',
  output_audio_format: 'none',
  vad_enabled: true,
  vad_sensitivity: 0.45,
  vad_prefix_silence_ms: 120,
  turn_max_ms: 30000,
  history_max_messages: 12,
  history_truncation: 'last',
  include_transcript_in_prompt: true,
  tools_enabled: ['knowledge_base'],
  tools_max_calls_per_turn: 3,
  tools_timeout_ms: 10000,
  safety_profanity_filter: true,
  denylist_keywords: '',
  fallback_model_chain: '',
  fallback_request_timeout_ms: 15000,
  ui_auto_start_mic: false,
  ui_echo_cancellation: true,
  ui_noise_suppression: true,
  ui_handoff_policy: 'manual',
};

const clampNumber = (value, min, max, fallback) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
};

const sanitizeText = (value, max = 4000) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
};
const buildModalitiesArray = (modalities) => {
  const detail = { text: true, audio_in: false, audio_out: false, vision: false, ...(modalities || {}) };
  const result = new Set(['text']);
  if (detail.audio_in || detail.audio_out) {
    result.add('audio');
  }
  if (detail.vision) {
    result.add('video');
  }
  return Array.from(result);
};

const sanitizeList = (raw, splitter = /\n+/) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => sanitizeText(String(item))).filter(Boolean);
  }
  return String(raw)
    .split(splitter)
    .map((item) => sanitizeText(item))
    .filter(Boolean);
};
const AssistantSettingsPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsRow, setSettingsRow] = useState(null);
  const [initialValues, setInitialValues] = useState(DEFAULT_VALUES);

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });

  const { control, register, reset, handleSubmit, watch, formState } = form;
  const isDirty = formState.isDirty;

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assistant_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Failed to load assistant settings', error);
      toast({ title: 'Erreur', description: "Impossible de charger la configuration de l'assistant.", variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (!data) {
      toast({ title: 'Assistant inactif', description: "Aucun enregistrement actif dans ssistant_settings.", variant: 'destructive' });
      setLoading(false);
      return;
    }

    const sessionConfig = data.session_config || {};
    const flags = data.flags || {};
    const modalitiesDetail = { text: true, audio_in: false, audio_out: false, vision: false, ...(flags.modalities_detail || {}) };
    const parsedValues = {
      system_prompt: sanitizeText(sessionConfig.instructions ?? flags.instructions ?? DEFAULT_VALUES.system_prompt),
      tone: flags.tone || DEFAULT_VALUES.tone,
      language_preference: flags.language_preference || DEFAULT_VALUES.language_preference,
      verbosity: flags.verbosity || DEFAULT_VALUES.verbosity,
      temperature: typeof sessionConfig.temperature === 'number' ? sessionConfig.temperature : (typeof flags.temperature === 'number' ? flags.temperature : DEFAULT_VALUES.temperature),
      top_p: typeof sessionConfig.top_p === 'number' ? sessionConfig.top_p : DEFAULT_VALUES.top_p,
      max_output_tokens: typeof sessionConfig.max_output_tokens === 'number' ? sessionConfig.max_output_tokens : DEFAULT_VALUES.max_output_tokens,
      json_mode: Boolean(flags.json_mode),
      modalities: modalitiesDetail,
      voice: data.voice || DEFAULT_VALUES.voice,
      output_audio_format: sessionConfig.output_audio_format || DEFAULT_VALUES.output_audio_format,
      vad_enabled: flags.vad?.enabled ?? DEFAULT_VALUES.vad_enabled,
      vad_sensitivity: typeof flags.vad?.sensitivity === 'number' ? flags.vad.sensitivity : DEFAULT_VALUES.vad_sensitivity,
      vad_prefix_silence_ms: typeof flags.vad?.prefix_silence_ms === 'number' ? flags.vad.prefix_silence_ms : DEFAULT_VALUES.vad_prefix_silence_ms,
      turn_max_ms: typeof flags.turn_max_ms === 'number' ? flags.turn_max_ms : DEFAULT_VALUES.turn_max_ms,
      history_max_messages: typeof flags.history?.max_messages === 'number' ? flags.history.max_messages : DEFAULT_VALUES.history_max_messages,
      history_truncation: flags.history?.truncation || DEFAULT_VALUES.history_truncation,
      include_transcript_in_prompt: flags.include_transcript_in_prompt ?? DEFAULT_VALUES.include_transcript_in_prompt,
      tools_enabled: Array.isArray(flags.tools?.enabled) && flags.tools.enabled.length ? flags.tools.enabled : DEFAULT_VALUES.tools_enabled,
      tools_max_calls_per_turn: typeof flags.tools?.max_calls_per_turn === 'number' ? flags.tools.max_calls_per_turn : DEFAULT_VALUES.tools_max_calls_per_turn,
      tools_timeout_ms: typeof flags.tools?.timeout_ms === 'number' ? flags.tools.timeout_ms : DEFAULT_VALUES.tools_timeout_ms,
      safety_profanity_filter: flags.safety?.profanity_filter ?? DEFAULT_VALUES.safety_profanity_filter,
      denylist_keywords: sanitizeList(flags.safety?.denylist_keywords).join('\n'),
      fallback_model_chain: sanitizeList(flags.fallback?.model_chain).join('\n'),
      fallback_request_timeout_ms: typeof flags.fallback?.request_timeout_ms === 'number' ? flags.fallback.request_timeout_ms : DEFAULT_VALUES.fallback_request_timeout_ms,
      ui_auto_start_mic: flags.ui?.auto_start_mic ?? DEFAULT_VALUES.ui_auto_start_mic,
      ui_echo_cancellation: flags.ui?.echo_cancellation ?? DEFAULT_VALUES.ui_echo_cancellation,
      ui_noise_suppression: flags.ui?.noise_suppression ?? DEFAULT_VALUES.ui_noise_suppression,
      ui_handoff_policy: flags.ui?.handoff_policy || DEFAULT_VALUES.ui_handoff_policy,
    };

    reset(parsedValues);
    setInitialValues(JSON.parse(JSON.stringify(parsedValues)));
    setSettingsRow(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleReset = () => {
    reset(initialValues);
  };
  const onSubmit = async (values) => {
    if (!settingsRow) return;
    setSaving(true);
    try {
      const cleanedPrompt = sanitizeText(values.system_prompt, 6000);
      const clampedTemperature = clampNumber(values.temperature, 0, 2, DEFAULT_VALUES.temperature);
      const clampedTopP = clampNumber(values.top_p, 0, 1, DEFAULT_VALUES.top_p);
      const clampedMaxTokens = clampNumber(values.max_output_tokens, 1, 32768, DEFAULT_VALUES.max_output_tokens);
      const modalitiesDetail = { text: true, audio_in: Boolean(values.modalities.audio_in), audio_out: Boolean(values.modalities.audio_out), vision: Boolean(values.modalities.vision) };

      const sessionConfig = {
        instructions: cleanedPrompt || undefined,
        temperature: clampedTemperature,
        top_p: clampedTopP,
        max_output_tokens: Math.floor(clampedMaxTokens),
        modalities: buildModalitiesArray(modalitiesDetail),
      };

      if (values.output_audio_format && values.output_audio_format !== 'none') {
        sessionConfig.output_audio_format = values.output_audio_format;
      } else {
        delete sessionConfig.output_audio_format;
      }

      const denylistKeywords = sanitizeList(values.denylist_keywords);
      const fallbackChain = sanitizeList(values.fallback_model_chain);

      const flagsPayload = {
        instructions: cleanedPrompt,
        temperature: clampedTemperature,
        tone: values.tone,
        language_preference: values.language_preference,
        verbosity: values.verbosity,
        json_mode: Boolean(values.json_mode),
        response_modalities: buildModalitiesArray(modalitiesDetail),
        modalities_detail: modalitiesDetail,
        vad: {
          enabled: Boolean(values.vad_enabled),
          sensitivity: clampNumber(values.vad_sensitivity, 0, 1, DEFAULT_VALUES.vad_sensitivity),
          prefix_silence_ms: Math.floor(clampNumber(values.vad_prefix_silence_ms, 0, 5000, DEFAULT_VALUES.vad_prefix_silence_ms)),
        },
        turn_max_ms: Math.floor(clampNumber(values.turn_max_ms, 1000, 120000, DEFAULT_VALUES.turn_max_ms)),
        history: {
          max_messages: Math.floor(clampNumber(values.history_max_messages, 0, 200, DEFAULT_VALUES.history_max_messages)),
          truncation: values.history_truncation,
        },
        include_transcript_in_prompt: Boolean(values.include_transcript_in_prompt),
        tools: {
          enabled: Array.isArray(values.tools_enabled) ? Array.from(new Set(values.tools_enabled)) : [],
          max_calls_per_turn: Math.floor(clampNumber(values.tools_max_calls_per_turn, 0, 20, DEFAULT_VALUES.tools_max_calls_per_turn)),
          timeout_ms: Math.floor(clampNumber(values.tools_timeout_ms, 1000, 120000, DEFAULT_VALUES.tools_timeout_ms)),
        },
        safety: {
          profanity_filter: Boolean(values.safety_profanity_filter),
          denylist_keywords: denylistKeywords,
        },
        fallback: {
          model_chain: fallbackChain,
          request_timeout_ms: Math.floor(clampNumber(values.fallback_request_timeout_ms, 1000, 120000, DEFAULT_VALUES.fallback_request_timeout_ms)),
        },
        ui: {
          auto_start_mic: Boolean(values.ui_auto_start_mic),
          echo_cancellation: Boolean(values.ui_echo_cancellation),
          noise_suppression: Boolean(values.ui_noise_suppression),
          handoff_policy: values.ui_handoff_policy,
        },
      };

      const payload = {
        voice: values.voice || null,
        session_config,
        flags: flagsPayload,
      };

      const { error } = await supabase
        .from('assistant_settings')
        .update(payload)
        .eq('id', settingsRow.id);

      if (error) {
        console.error('Failed to update assistant settings', error);
        toast({ title: 'Erreur', description: "Impossible d'enregistrer les paramètres.", variant: 'destructive' });
      } else {
        toast({ title: 'Assistant IA', description: 'Paramètres mis à jour.', className: 'bg-green-500 text-white' });
        setInitialValues(JSON.parse(JSON.stringify(values)));
        reset(values);
      }
    } catch (error) {
      console.error('Unexpected error while saving assistant settings', error);
      toast({ title: 'Erreur', description: 'Une erreur inattendue est survenue.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const modalities = watch('modalities');
  return (
    <div className="space-y-6">
      <Card className="border border-border/60">
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Bot className="h-5 w-5 text-primary" />
              Assistant IA – Paramétrage
            </CardTitle>
            <CardDescription>Personnalise le comportement temps réel sans exposer les secrets.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={loading || saving || !isDirty}>
              <RotateCcw className="mr-2 h-4 w-4" />Annuler
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={loading || saving || !isDirty}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des paramètres…
            </div>
          ) : (
            <div className="space-y-6">
              <section className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-muted/30 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Comportement conversationnel</CardTitle>
                    <CardDescription>Prompt système, ton et langue cible.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="system_prompt">System prompt</Label>
                      <Textarea
                        id="system_prompt"
                        placeholder="Décris la personnalité et les consignes…"
                        maxLength={6000}
                        rows={5}
                        {...register('system_prompt')}
                      />
                      <p className="text-xs text-muted-foreground">6000 caractères max.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Tonalité</Label>
                        <Controller
                          control={control}
                          name="tone"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TONE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Langue préférée</Label>
                        <Controller
                          control={control}
                          name="language_preference"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LANGUAGE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Verbosité</Label>
                        <Controller
                          control={control}
                          name="verbosity"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {VERBOSITY_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">Inclure la transcription</p>
                          <p className="text-xs text-muted-foreground">Injecter la VAD dans le prompt système.</p>
                        </div>
                        <Controller
                          control={control}
                          name="include_transcript_in_prompt"
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Génération & Modalités</CardTitle>
                    <CardDescription>Paramètres du modèle temps réel.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Temperature</Label>
                        <Input type="number" step="0.05" min="0" max="2" {...register('temperature', { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Top P</Label>
                        <Input type="number" step="0.05" min="0" max="1" {...register('top_p', { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tokens max</Label>
                        <Input type="number" min="1" max="32768" {...register('max_output_tokens', { valueAsNumber: true })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Voix</Label>
                      <Controller
                        control={control}
                        name="voice"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VOICE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Format audio de sortie</Label>
                      <Controller
                        control={control}
                        name="output_audio_format"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {OUTPUT_AUDIO_FORMAT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Modalités</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-3 py-2">
                          <Checkbox checked disabled />
                          <span className="text-sm">Texte (obligatoire)</span>
                        </div>
                        {['audio_in', 'audio_out', 'vision'].map((key) => (
                          <div key={key} className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-3 py-2">
                            <Controller
                              control={control}
                              name={`modalities.${key}`}
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                />
                              )}
                            />
                            <span className="text-sm">{key === 'audio_in' ? 'Audio entrant' : key === 'audio_out' ? 'Audio sortant' : 'Vision'}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Audio sortant active l'usage du format sélectionné.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">Détection VAD</p>
                          <p className="text-xs text-muted-foreground">Active la détection de prise de parole.</p>
                        </div>
                        <Controller
                          control={control}
                          name="vad_enabled"
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Sensibilité</Label>
                          <Input type="number" step="0.05" min="0" max="1" {...register('vad_sensitivity', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Silence prefix (ms)</Label>
                          <Input type="number" min="0" max="5000" {...register('vad_prefix_silence_ms', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Durée max tour (ms)</Label>
                          <Input type="number" min="1000" max="120000" {...register('turn_max_ms', { valueAsNumber: true })} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
              <section className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-muted/30 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Historique & fallback</CardTitle>
                    <CardDescription>Contrôle de l'empilement des messages.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Messages max</Label>
                        <Input type="number" min="0" max="200" {...register('history_max_messages', { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Stratégie de troncature</Label>
                        <Controller
                          control={control}
                          name="history_truncation"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {HISTORY_TRUNCATION_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Chaîne de modèles de secours</Label>
                      <Textarea rows={3} placeholder="Ex: gpt-4o\ngpt-4o-mini" {...register('fallback_model_chain')} />
                      <p className="text-xs text-muted-foreground">Une référence par ligne.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Timeout de requête fallback (ms)</Label>
                      <Input type="number" min="1000" max="120000" {...register('fallback_request_timeout_ms', { valueAsNumber: true })} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Outils & sécurité</CardTitle>
                    <CardDescription>Contrôle des outils autorisés et du filtrage.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Outils autorisés</Label>
                      <Controller
                        control={control}
                        name="tools_enabled"
                        render={({ field }) => (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {TOOL_OPTIONS.map((opt) => {
                              const checked = Array.isArray(field.value) && field.value.includes(opt.value);
                              return (
                                <label key={opt.value} className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-3 py-2 text-sm">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => {
                                      const isChecked = Boolean(value);
                                      if (isChecked) {
                                        field.onChange([...(field.value || []), opt.value]);
                                      } else {
                                        field.onChange((field.value || []).filter((item) => item !== opt.value));
                                      }
                                    }}
                                  />
                                  {opt.label}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Appels max / tour</Label>
                        <Input type="number" min="0" max="20" {...register('tools_max_calls_per_turn', { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Timeout outils (ms)</Label>
                        <Input type="number" min="1000" max="120000" {...register('tools_timeout_ms', { valueAsNumber: true })} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">Filtre de contenu</p>
                        <p className="text-xs text-muted-foreground">Active le filtre grossièretés/profanités.</p>
                      </div>
                      <Controller
                        control={control}
                        name="safety_profanity_filter"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mots interdits</Label>
                      <Textarea rows={3} placeholder="Un mot ou regex par ligne" {...register('denylist_keywords')} />
                    </div>
                  </CardContent>
                </Card>
              </section>
              <section className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-muted/30 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Interface & audio</CardTitle>
                    <CardDescription>Réglages front-end appliqués côté client.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">Démarrage auto du micro</p>
                        <p className="text-xs text-muted-foreground">Active automatiquement le micro à la connexion.</p>
                      </div>
                      <Controller
                        control={control}
                        name="ui_auto_start_mic"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">Annulation d'écho</p>
                        </div>
                        <Controller
                          control={control}
                          name="ui_echo_cancellation"
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">Réduction de bruit</p>
                        </div>
                        <Controller
                          control={control}
                          name="ui_noise_suppression"
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Politique de handoff</Label>
                      <Controller
                        control={control}
                        name="ui_handoff_policy"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UI_HANDOFF_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Synthèse des modalités</CardTitle>
                    <CardDescription>Vue rapide des choix actuels.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md border border-border/40 bg-background px-4 py-3 text-sm">
                      <p className="font-medium">Modalités envoyées</p>
                      <p className="text-muted-foreground">{buildModalitiesArray(modalities).join(', ')}</p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-background px-4 py-3 text-sm">
                      <p className="font-medium">Outils actifs</p>
                      <p className="text-muted-foreground">{(watch('tools_enabled') || []).length ? (watch('tools_enabled') || []).join(', ') : 'Aucun'}</p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-background px-4 py-3 text-sm">
                      <p className="font-medium">Profanités</p>
                      <p className="text-muted-foreground">{watch('safety_profanity_filter') ? 'Filtre activé' : 'Filtre désactivé'}</p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssistantSettingsPanel;
