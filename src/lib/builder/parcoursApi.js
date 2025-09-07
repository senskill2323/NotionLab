import { supabase } from '@/lib/customSupabaseClient';

export const fetchModuleCatalog = async () => {
  // 1) Get module IDs used in standard 'live' courses
  const { data: liveStandardCourses, error: coursesError } = await supabase
    .from('courses')
    .select('nodes')
    .eq('course_type', 'standard')
    .eq('status', 'live');

  const allowedModuleIds = new Set();
  if (!coursesError && Array.isArray(liveStandardCourses)) {
    for (const course of liveStandardCourses) {
      if (Array.isArray(course?.nodes)) {
        for (const node of course.nodes) {
          if (node?.type === 'moduleNode' && node?.data?.moduleId) {
            allowedModuleIds.add(node.data.moduleId);
          }
        }
      }
    }
  }

  // 2) Fetch full catalog and filter modules client-side
  const { data, error } = await supabase
    .from('builder_families')
    .select(`*, subfamilies:builder_subfamilies (*, modules:builder_modules (*))`)
    .order('display_order', { ascending: true })
    .order('display_order', { foreignTable: 'subfamilies', ascending: true })
    .order('display_order', { foreignTable: 'subfamilies.modules', ascending: true });
  if (error) throw error;

  const filtered = (data || []).map(f => ({
    ...f,
    subfamilies: (f.subfamilies || []).map(sf => ({
      ...sf,
      modules: (sf.modules || []).filter(m => allowedModuleIds.has(m.id))
    }))
  }));

  return filtered;
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