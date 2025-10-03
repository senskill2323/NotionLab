import { supabase } from '@/lib/customSupabaseClient';

export async function fetchAssistantSettings() {
  const { data, error } = await supabase
    .from('assistant_settings')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensureAssistantLimits(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('assistant_limits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('assistant_limits')
    .upsert({ user_id: userId })
    .select('*')
    .maybeSingle();

  if (insertError) throw insertError;
  return inserted;
}

export async function updateAssistantLimits(userId, patch) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('assistant_limits')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertAssistantMetric(entry) {
  const { data, error } = await supabase
    .from('assistant_metrics')
    .insert(entry)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateAssistantMetric(userId, sessionId, patch) {
  const { data, error } = await supabase
    .from('assistant_metrics')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}
