import { supabase } from '@/lib/customSupabaseClient';

export const fetchModuleCatalog = async () => {
  const { data, error } = await supabase
    .from('builder_families')
    .select(`*, subfamilies:builder_subfamilies (*, modules:builder_modules (*))`)
    .order('display_order', { ascending: true })
    .order('display_order', { foreignTable: 'subfamilies', ascending: true })
    .order('display_order', { foreignTable: 'subfamilies.modules', ascending: true });
  if (error) throw error;
  return data;
};

export const fetchUserParcoursList = async (userId) => {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, updated_at')
    .eq('author_id', userId)
    .eq('course_type', 'custom')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const loadParcoursFromDB = async (parcoursId) => {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, nodes, edges')
    .eq('id', parcoursId)
    .eq('course_type', 'custom')
    .single();
  if (error) throw error;
  return data;
};

export const saveParcoursToDB = async (parcoursId, parcoursData) => {
  const { data, error } = parcoursId
    ? await supabase.from('courses').update(parcoursData).eq('id', parcoursId).select().single()
    : await supabase.from('courses').insert(parcoursData).select().single();
  if (error) throw error;
  return data;
};

export const duplicateParcoursInDB = async (parcoursData) => {
    const { data, error } = await supabase.from('courses').insert(parcoursData).select().single();
    if (error) throw error;
    return data;
};

export const deleteParcoursFromDB = async (parcoursId) => {
    const { error } = await supabase.from('courses').delete().eq('id', parcoursId);
    if (error) throw error;
};

export const updateParcoursNameInDB = async (parcoursId, newName) => {
    const { error } = await supabase
        .from('courses')
        .update({ title: newName })
        .eq('id', parcoursId);
    if (error) throw error;
};