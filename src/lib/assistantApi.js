import { supabase } from '@/lib/customSupabaseClient';

export async function ragSearch({ query, includeSources = false, image = null, file = null }) {
  const payload = { query, includeSources, image, file };
  const { data, error } = await supabase.functions.invoke('rag-search', { body: payload });
  if (error) throw error;
  return data;
}

export async function getMemory() {
  const { data, error } = await supabase.functions.invoke('memory', { body: { action: 'get' } });
  if (error) throw error;
  return data;
}

export async function updateMemory(patch) {
  const { data, error } = await supabase.functions.invoke('memory', { body: { action: 'update', patch } });
  if (error) throw error;
  return data;
}

// Optionnel: lecture/recherche mémoire ciblée (via N8N_MEMORY_SEARCH_URL)
// body: { query?: string, top_k?: number }
export async function searchMemory({ query, top_k } = {}) {
  const body = {};
  if (typeof query === 'string') body.query = query;
  if (typeof top_k === 'number') body.top_k = top_k;
  const { data, error } = await supabase.functions.invoke('memory', { body });
  if (error) throw error;
  return data;
}
