import { supabase } from '@/lib/customSupabaseClient';

const SETTINGS_ID = 'GLOBAL';

export async function getAssistantSettings() {
  const { data, error } = await supabase
    .from('assistant_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertAssistantSettings(patch) {
  const payload = { id: SETTINGS_ID, ...patch };
  const { data, error } = await supabase
    .from('assistant_settings')
    .upsert(payload)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAssistantLimits(scope = 'global') {
  const { data, error } = await supabase
    .from('assistant_limits')
    .select('*')
    .eq('scope', scope)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertAssistantLimit(limit) {
  const { data, error } = await supabase
    .from('assistant_limits')
    .upsert(limit)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function testRag(query = 'Test admin RAG') {
  const { data, error } = await supabase.functions.invoke('rag-search', {
    body: { query, includeSources: true },
  });
  if (error) throw error;
  return data;
}

export async function testMemorySearch(opts = {}) {
  const { data, error } = await supabase.functions.invoke('memory', {
    body: { query: typeof opts.query === 'string' ? opts.query : 'test' },
  });
  if (error) throw error;
  return data;
}

export async function testMemoryWrite(key = 'admin_test', value = new Date().toISOString()) {
  const { data, error } = await supabase.functions.invoke('memory', {
    body: { action: 'update', patch: { [key]: value } },
  });
  if (error) throw error;
  return data;
}

export async function getRecentAssistantMetrics(limit = 20) {
  const { data, error } = await supabase
    .from('assistant_metrics')
    .select('*')
    .order('ts', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Generate a short TTS preview using the voice settings
export async function ttsPreview(opts = {}) {
  const body = {};
  if (typeof opts.voice === 'string') body.voice = opts.voice;
  if (typeof opts.text === 'string') body.text = opts.text;
  const { data, error } = await supabase.functions.invoke('tts-preview', { body });
  if (error) throw error;
  return data;
}

// Exchange a WebRTC SDP offer against the Realtime provider and get an answer
export async function createRealtimeAnswer(sdp) {
  if (!sdp || typeof sdp !== 'string') throw new Error('Invalid SDP offer');
  const { data, error } = await supabase.functions.invoke('realtime-offer', {
    body: { sdp },
  });
  if (error) throw error;
  return data;
}
