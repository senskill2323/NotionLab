import { supabase } from '@/lib/customSupabaseClient';

const mapNodeForPersistence = (node) => ({
  id: node.id,
  type: node.type,
  title: node.data?.title ?? node.data?.label ?? node.data?.name ?? 'Bloc',
  family: node.data?.family ?? null,
  subfamily: node.data?.subfamily ?? null,
  elementKey: node.data?.elementKey ?? node.data?.id ?? null,
  position: {
    x: node.position?.x ?? 0,
    y: node.position?.y ?? 0,
  },
  radius: node.data?.radius ?? 140,
  fields: node.data?.fields ?? {},
  metadata: node.data?.metadata ?? {},
});

const mapEdgeForPersistence = (edge) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  label: edge.label ?? null,
  metadata: edge.data?.metadata ?? {},
});

export async function listBlueprints() {
  const { data, error } = await supabase.rpc('list_blueprints');
  if (error) throw error;
  return data ?? [];
}

export async function getBlueprintById(id) {
  const { data, error } = await supabase.rpc('get_blueprint', { p_blueprint_id: id });
  if (error) throw error;
  if (!data) return null;
  return {
    blueprint: data.blueprint,
    nodes: (data.nodes ?? []).map((node) => ({
      id: node.id,
      type: node.type,
      position: {
        x: Number(node.position_x) || 0,
        y: Number(node.position_y) || 0,
      },
      data: {
        title: node.title,
        family: node.family,
        subfamily: node.subfamily,
        elementKey: node.element_key,
        radius: node.radius,
        fields: node.fields ?? {},
        metadata: node.metadata ?? {},
      },
      draggable: node.metadata?.locked ? false : true,
    })),
    edges: (data.edges ?? []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? undefined,
      data: {
        metadata: edge.metadata ?? {},
      },
      type: 'smoothstep',
    })),
  };
}

export async function upsertBlueprintGraph({
  blueprintId,
  title,
  description,
  status = 'draft',
  metadata = {},
  nodes,
  edges,
  deletedNodeIds = [],
  deletedEdgeIds = [],
  autosave = true,
  expectedAutosaveVersion = null,
}) {
  const nodesPayload = (nodes ?? []).map(mapNodeForPersistence);
  const edgesPayload = (edges ?? []).map(mapEdgeForPersistence);
  const deletedNodeIdsPayload = Array.isArray(deletedNodeIds) ? deletedNodeIds.filter(Boolean) : [];
  const deletedEdgeIdsPayload = Array.isArray(deletedEdgeIds) ? deletedEdgeIds.filter(Boolean) : [];

  const { data, error } = await supabase.rpc('blueprints_upsert_graph', {
    p_blueprint_id: blueprintId ?? null,
    p_title: title ?? null,
    p_description: description ?? null,
    p_status: status ?? 'draft',
    p_metadata: metadata,
    p_nodes: nodesPayload,
    p_edges: edgesPayload,
    p_deleted_node_ids: deletedNodeIdsPayload,
    p_deleted_edge_ids: deletedEdgeIdsPayload,
    p_autosave: autosave,
    p_expected_autosave_version: expectedAutosaveVersion,
  });

  if (error) throw error;
  return data;
}

export async function deleteBlueprint(blueprintId) {
  const { error } = await supabase.from('blueprints').delete().eq('id', blueprintId);
  if (error) throw error;
}

export async function duplicateBlueprint(blueprintId, newTitle) {
  const { data, error } = await supabase.rpc('duplicate_blueprint', {
    p_blueprint_id: blueprintId,
    p_new_title: newTitle ?? null,
  });
  if (error) throw error;
  return data;
}

export async function createBlueprintSnapshot(blueprintId, options = {}) {
  const { label = null, metadata = {} } = options;
  const { data, error } = await supabase.rpc('create_blueprint_snapshot', {
    p_blueprint_id: blueprintId,
    p_label: label,
    p_metadata: metadata,
  });
  if (error) throw error;
  return data;
}

export async function createBlueprintShare(blueprintId, options = {}) {
  const { expiresAt = null, metadata = {} } = options;
  const { data, error } = await supabase.rpc('create_blueprint_share', {
    p_blueprint_id: blueprintId,
    p_expires_at: expiresAt,
    p_metadata: metadata,
  });
  if (error) throw error;
  if (!data) return null;
  return {
    token: data.token ?? null,
    expiresAt: data.expires_at ?? null,
  };
}

export async function getBlueprintPublic(token) {
  const { data, error } = await supabase.rpc('get_blueprint_public', { p_token: token });
  if (error) throw error;
  return data;
}

export async function renameBlueprint({ blueprintId, nextTitle, expectedAutosaveVersion } = {}) {
  const { data, error } = await supabase.rpc('rename_blueprint_with_version', {
    p_blueprint_id: blueprintId,
    p_next_title: nextTitle ?? null,
    p_expected_autosave_version:
      typeof expectedAutosaveVersion === 'number' && Number.isFinite(expectedAutosaveVersion)
        ? expectedAutosaveVersion
        : null,
  });
  if (error) throw error;
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function updateBlueprintMetadata(blueprintId, patch) {
  const { error } = await supabase
    .from('blueprints')
    .update({ metadata: patch, updated_at: new Date().toISOString() })
    .eq('id', blueprintId);
  if (error) throw error;
}

export async function fetchBlueprintPalette() {
  const { data, error } = await supabase.rpc('get_blueprint_palette_catalog');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function upsertPaletteFamily({ id = null, label = null, description = null, sortOrder = null, isActive = null } = {}) {
  const { data, error } = await supabase.rpc('upsert_blueprint_palette_family', {
    p_family_id: id,
    p_label: label,
    p_description: description,
    p_sort_order: sortOrder,
    p_is_active: isActive,
  });
  if (error) throw error;
  return data;
}

export async function deletePaletteFamily(familyId) {
  const { error } = await supabase.rpc('delete_blueprint_palette_family', {
    p_family_id: familyId,
  });
  if (error) throw error;
}

export async function upsertPaletteItem({ id = null, familyId = null, label = null, description = null, sortOrder = null, isActive = null } = {}) {
  const { data, error } = await supabase.rpc('upsert_blueprint_palette_item', {
    p_item_id: id,
    p_family_id: familyId,
    p_label: label,
    p_description: description,
    p_sort_order: sortOrder,
    p_is_active: isActive,
  });
  if (error) throw error;
  return data;
}

export async function deletePaletteItem(itemId) {
  const { error } = await supabase.rpc('delete_blueprint_palette_item', {
    p_item_id: itemId,
  });
  if (error) throw error;
}


