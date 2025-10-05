BEGIN;

CREATE TABLE IF NOT EXISTS public.blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  autosave_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blueprints_owner_id_idx ON public.blueprints(owner_id);
CREATE INDEX IF NOT EXISTS blueprints_status_idx ON public.blueprints(status);

ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_blueprints_set_updated_at ON public.blueprints;
CREATE TRIGGER trg_blueprints_set_updated_at
  BEFORE UPDATE ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.blueprint_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'node',
  title text NOT NULL,
  family text,
  subfamily text,
  element_key text,
  position_x double precision NOT NULL DEFAULT 0,
  position_y double precision NOT NULL DEFAULT 0,
  radius double precision NOT NULL DEFAULT 140,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blueprint_nodes_blueprint_idx ON public.blueprint_nodes(blueprint_id);

ALTER TABLE public.blueprint_nodes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_blueprint_nodes_set_updated_at ON public.blueprint_nodes;
CREATE TRIGGER trg_blueprint_nodes_set_updated_at
  BEFORE UPDATE ON public.blueprint_nodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.blueprint_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  source uuid NOT NULL REFERENCES public.blueprint_nodes(id) ON DELETE CASCADE,
  target uuid NOT NULL REFERENCES public.blueprint_nodes(id) ON DELETE CASCADE,
  label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blueprint_edges_blueprint_idx ON public.blueprint_edges(blueprint_id);
CREATE INDEX IF NOT EXISTS blueprint_edges_connections_idx ON public.blueprint_edges(blueprint_id, source, target);

ALTER TABLE public.blueprint_edges ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_blueprint_edges_set_updated_at ON public.blueprint_edges;
CREATE TRIGGER trg_blueprint_edges_set_updated_at
  BEFORE UPDATE ON public.blueprint_edges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.blueprint_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blueprint_snapshots_blueprint_idx ON public.blueprint_snapshots(blueprint_id);
CREATE INDEX IF NOT EXISTS blueprint_snapshots_created_idx ON public.blueprint_snapshots(created_at);

ALTER TABLE public.blueprint_snapshots ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.blueprint_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blueprint_shares
  ADD COLUMN last_accessed_at timestamptz;

-- TODO: planifier une routine pour purger ou archiver les tokens expires.


CREATE INDEX IF NOT EXISTS blueprint_shares_blueprint_idx ON public.blueprint_shares(blueprint_id);
CREATE INDEX IF NOT EXISTS blueprint_shares_active_idx ON public.blueprint_shares(token, is_active);

ALTER TABLE public.blueprint_shares ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_edges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_shares TO authenticated;

GRANT SELECT ON public.blueprint_shares TO anon;

DO $blueprints_policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprints' AND policyname = 'blueprints_select_own'
  ) THEN
    EXECUTE $$CREATE POLICY blueprints_select_own ON public.blueprints
      FOR SELECT
      USING (owner_id = auth.uid())$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprints' AND policyname = 'blueprints_select_admin'
  ) THEN
    EXECUTE $$CREATE POLICY blueprints_select_admin ON public.blueprints
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.user_type IN ('owner','admin')
        )
      )$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprints' AND policyname = 'blueprints_insert_own'
  ) THEN
    EXECUTE $$CREATE POLICY blueprints_insert_own ON public.blueprints
      FOR INSERT
      WITH CHECK (owner_id = auth.uid())$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprints' AND policyname = 'blueprints_manage_self'
  ) THEN
    EXECUTE $$CREATE POLICY blueprints_manage_self ON public.blueprints
      FOR UPDATE
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid())$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprints' AND policyname = 'blueprints_manage_admin'
  ) THEN
    EXECUTE $$CREATE POLICY blueprints_manage_admin ON public.blueprints
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.user_type IN ('owner','admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.user_type IN ('owner','admin')
        )
      )$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprints' AND policyname = 'blueprints_delete_self'
  ) THEN
    EXECUTE $$CREATE POLICY blueprints_delete_self ON public.blueprints
      FOR DELETE
      USING (
        owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.user_type IN ('owner','admin')
        )
      )$$;
  END IF;
END;
$blueprints_policy$;

DO $blueprint_nodes_policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprint_nodes' AND policyname = 'blueprint_nodes_manage'
  ) THEN
    EXECUTE $$CREATE POLICY blueprint_nodes_manage ON public.blueprint_nodes
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.blueprints b
          WHERE b.id = blueprint_id
            AND (
              b.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.user_type IN ('owner','admin')
              )
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.blueprints b
          WHERE b.id = blueprint_id
            AND (
              b.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.user_type IN ('owner','admin')
              )
            )
        )
      )$$;
  END IF;
END;
$blueprint_nodes_policy$;

DO $blueprint_edges_policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprint_edges' AND policyname = 'blueprint_edges_manage'
  ) THEN
    EXECUTE $$CREATE POLICY blueprint_edges_manage ON public.blueprint_edges
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.blueprints b
          WHERE b.id = blueprint_id
            AND (
              b.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.user_type IN ('owner','admin')
              )
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.blueprints b
          WHERE b.id = blueprint_id
            AND (
              b.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.user_type IN ('owner','admin')
              )
            )
        )
      )$$;
  END IF;
END;
$blueprint_edges_policy$;

DO $blueprint_snapshots_policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprint_snapshots' AND policyname = 'blueprint_snapshots_manage'
  ) THEN
    EXECUTE $$CREATE POLICY blueprint_snapshots_manage ON public.blueprint_snapshots
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.blueprints b
          WHERE b.id = blueprint_id
            AND (
              b.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.user_type IN ('owner','admin')
              )
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.blueprints b
          WHERE b.id = blueprint_id
            AND (
              b.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.user_type IN ('owner','admin')
              )
            )
        )
      )$$;
  END IF;
END;
$blueprint_snapshots_policy$;

DO $blueprint_shares_policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprint_shares' AND policyname = 'blueprint_shares_read_public'
  ) THEN
    EXECUTE $$CREATE POLICY blueprint_shares_read_public ON public.blueprint_shares
      FOR SELECT
      TO anon
      USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > now()))$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blueprint_shares' AND policyname = 'blueprint_shares_manage'
  ) THEN
    EXECUTE $$CREATE POLICY blueprint_shares_manage ON public.blueprint_shares
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.blueprints b
          WHERE b.id = blueprint_id
            AND (
              b.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.user_type IN ('owner','admin')
              )
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.blueprints b
          WHERE b.id = blueprint_id
            AND (
              b.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.user_type IN ('owner','admin')
              )
            )
        )
      )$$;
  END IF;
END;
$blueprint_shares_policy$;

CREATE OR REPLACE FUNCTION public.list_blueprints()
RETURNS SETOF public.blueprints
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT *
  FROM public.blueprints
  WHERE owner_id = auth.uid()
     OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.user_type IN ('owner','admin')
      )
  ORDER BY updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_blueprint(p_blueprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_blueprint jsonb;
BEGIN
  SELECT to_jsonb(b.*)
  INTO v_blueprint
  FROM public.blueprints b
  WHERE b.id = p_blueprint_id
    AND (
      b.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.user_type IN ('owner','admin')
      )
    );

  IF v_blueprint IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'blueprint', v_blueprint,
    'nodes', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(n) - 'blueprint_id')
        FROM public.blueprint_nodes n
        WHERE n.blueprint_id = p_blueprint_id
      ),
      '[]'::jsonb
    ),
    'edges', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(e) - 'blueprint_id')
        FROM public.blueprint_edges e
        WHERE e.blueprint_id = p_blueprint_id
      ),
      '[]'::jsonb
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.blueprints_upsert_graph(
  p_blueprint_id uuid,
  p_title text,
  p_description text,
  p_status text,
  p_metadata jsonb,
  p_nodes jsonb,
  p_edges jsonb,
  p_deleted_node_ids uuid[] DEFAULT NULL,
  p_deleted_edge_ids uuid[] DEFAULT NULL,
  p_autosave boolean DEFAULT true,
  p_expected_autosave_version integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_blueprint_id uuid;
  v_owner uuid;
  v_current_autosave_version integer;
  v_deleted_node_ids uuid[];
  v_deleted_edge_ids uuid[];
BEGIN
  IF p_deleted_node_ids IS NOT NULL THEN
    SELECT ARRAY(
      SELECT DISTINCT id
      FROM unnest(p_deleted_node_ids) AS id
      WHERE id IS NOT NULL
    )
    INTO v_deleted_node_ids;
  END IF;

  IF p_deleted_edge_ids IS NOT NULL THEN
    SELECT ARRAY(
      SELECT DISTINCT id
      FROM unnest(p_deleted_edge_ids) AS id
      WHERE id IS NOT NULL
    )
    INTO v_deleted_edge_ids;
  END IF;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_blueprint_id IS NULL THEN
    v_blueprint_id := gen_random_uuid();
    INSERT INTO public.blueprints (id, owner_id, title, description, status, metadata, autosave_version)
    VALUES (
      v_blueprint_id,
      v_actor,
      COALESCE(NULLIF(p_title, ''), 'Blueprint sans titre'),
      COALESCE(p_description, ''),
      COALESCE(NULLIF(p_status, ''), 'draft'),
      COALESCE(p_metadata, '{}'::jsonb),
      1
    );
  ELSE
    v_blueprint_id := p_blueprint_id;
    SELECT owner_id, autosave_version INTO v_owner, v_current_autosave_version
    FROM public.blueprints
    WHERE id = v_blueprint_id
    FOR UPDATE;

    IF v_owner IS NULL THEN
      RAISE EXCEPTION 'Blueprint introuvable';
    END IF;

    IF v_owner <> v_actor AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_actor
        AND p.user_type IN ('owner','admin')
    ) THEN
      RAISE EXCEPTION 'Accès refusé';
    END IF;

    IF p_expected_autosave_version IS NOT NULL AND p_expected_autosave_version <> v_current_autosave_version THEN
      PERFORM set_config('response.status', '409', true);
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Autosave conflict detected', DETAIL = format('expected version %s but found %s', p_expected_autosave_version, v_current_autosave_version);
    END IF;

    UPDATE public.blueprints
    SET
      title = COALESCE(NULLIF(p_title, ''), title),
      description = COALESCE(p_description, description),
      status = COALESCE(NULLIF(p_status, ''), status),
      metadata = COALESCE(p_metadata, metadata),
      autosave_version = CASE WHEN p_autosave THEN autosave_version + 1 ELSE autosave_version END,
      updated_at = now()
    WHERE id = v_blueprint_id;
  END IF;

  IF p_nodes IS NOT NULL THEN
    INSERT INTO public.blueprint_nodes (
      id,
      blueprint_id,
      type,
      title,
      family,
      subfamily,
      element_key,
      position_x,
      position_y,
      radius,
      fields,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      COALESCE((node->>'id')::uuid, gen_random_uuid()),
      v_blueprint_id,
      COALESCE(node->>'type', 'node'),
      COALESCE(node->>'title', node->'data'->>'label', 'Bloc'),
      node->>'family',
      node->>'subfamily',
      node->>'elementKey',
      COALESCE((node->'position'->>'x')::double precision, 0),
      COALESCE((node->'position'->>'y')::double precision, 0),
      COALESCE((node->>'radius')::double precision, 140),
      COALESCE(node->'fields', '{}'::jsonb),
      COALESCE(node->'metadata', '{}'::jsonb),
      now(),
      now()
    FROM jsonb_array_elements(p_nodes) AS node
    ON CONFLICT (id) DO UPDATE
      SET
        type = EXCLUDED.type,
        title = EXCLUDED.title,
        family = EXCLUDED.family,
        subfamily = EXCLUDED.subfamily,
        element_key = EXCLUDED.element_key,
        position_x = EXCLUDED.position_x,
        position_y = EXCLUDED.position_y,
        radius = EXCLUDED.radius,
        fields = EXCLUDED.fields,
        metadata = EXCLUDED.metadata,
        updated_at = now();

  END IF;

  IF v_deleted_node_ids IS NOT NULL AND array_length(v_deleted_node_ids, 1) IS NOT NULL THEN
    DELETE FROM public.blueprint_nodes
    WHERE blueprint_id = v_blueprint_id
      AND id = ANY(v_deleted_node_ids);
  END IF;

  IF p_edges IS NOT NULL THEN
    INSERT INTO public.blueprint_edges (
      id,
      blueprint_id,
      source,
      target,
      label,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      COALESCE((edge->>'id')::uuid, gen_random_uuid()),
      v_blueprint_id,
      (edge->>'source')::uuid,
      (edge->>'target')::uuid,
      edge->>'label',
      COALESCE(edge->'metadata', '{}'::jsonb),
      now(),
      now()
    FROM jsonb_array_elements(p_edges) AS edge
    ON CONFLICT (id) DO UPDATE
      SET
        source = EXCLUDED.source,
        target = EXCLUDED.target,
        label = EXCLUDED.label,
        metadata = EXCLUDED.metadata,
        updated_at = now();

  END IF;

  IF v_deleted_edge_ids IS NOT NULL AND array_length(v_deleted_edge_ids, 1) IS NOT NULL THEN
    DELETE FROM public.blueprint_edges
    WHERE blueprint_id = v_blueprint_id
      AND id = ANY(v_deleted_edge_ids);
  END IF;

  RETURN v_blueprint_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.duplicate_blueprint(p_blueprint_id uuid, p_new_title text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_new_id uuid := gen_random_uuid();
  v_title text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT owner_id, COALESCE(NULLIF(p_new_title, ''), title || ' (copie)')
  INTO v_owner, v_title
  FROM public.blueprints
  WHERE id = p_blueprint_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Blueprint introuvable';
  END IF;

  IF v_owner <> v_actor AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_actor
      AND p.user_type IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  INSERT INTO public.blueprints (id, owner_id, title, description, status, metadata, autosave_version, created_at, updated_at)
  SELECT
    v_new_id,
    v_actor,
    v_title,
    description,
    'draft',
    metadata,
    1,
    now(),
    now()
  FROM public.blueprints
  WHERE id = p_blueprint_id;

DROP TABLE IF EXISTS tmp_node_map;
CREATE TEMP TABLE tmp_node_map (old_id uuid PRIMARY KEY, new_id uuid) ON COMMIT DROP;

INSERT INTO tmp_node_map(old_id, new_id)
SELECT id, gen_random_uuid()
FROM public.blueprint_nodes
WHERE blueprint_id = p_blueprint_id;

INSERT INTO public.blueprint_nodes (id, blueprint_id, type, title, family, subfamily, element_key, position_x, position_y, radius, fields, metadata, created_at, updated_at)
SELECT
  map.new_id,
  v_new_id,
  n.type,
  n.title,
  n.family,
  n.subfamily,
  n.element_key,
  n.position_x,
  n.position_y,
  n.radius,
  n.fields,
  n.metadata,
  now(),
  now()
FROM public.blueprint_nodes n
JOIN tmp_node_map map ON map.old_id = n.id
WHERE n.blueprint_id = p_blueprint_id;

INSERT INTO public.blueprint_edges (id, blueprint_id, source, target, label, metadata, created_at, updated_at)
SELECT
  gen_random_uuid(),
  v_new_id,
  (SELECT new_id FROM tmp_node_map WHERE old_id = e.source),
  (SELECT new_id FROM tmp_node_map WHERE old_id = e.target),
  e.label,
  e.metadata,
  now(),
  now()
FROM public.blueprint_edges e
WHERE e.blueprint_id = p_blueprint_id;

  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_blueprint_snapshot(p_blueprint_id uuid, p_label text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_snapshot_id uuid := gen_random_uuid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT owner_id INTO v_owner FROM public.blueprints WHERE id = p_blueprint_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Blueprint introuvable';
  END IF;

  IF v_owner <> v_actor AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_actor
      AND p.user_type IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  INSERT INTO public.blueprint_snapshots (id, blueprint_id, author_id, payload, label, metadata, created_at)
  VALUES (
    v_snapshot_id,
    p_blueprint_id,
    v_actor,
    jsonb_build_object(
      'blueprint', (SELECT to_jsonb(b.*) FROM public.blueprints b WHERE b.id = p_blueprint_id),
      'nodes', (SELECT COALESCE(jsonb_agg(to_jsonb(n) - 'blueprint_id'), '[]'::jsonb) FROM public.blueprint_nodes n WHERE n.blueprint_id = p_blueprint_id),
      'edges', (SELECT COALESCE(jsonb_agg(to_jsonb(e) - 'blueprint_id'), '[]'::jsonb) FROM public.blueprint_edges e WHERE e.blueprint_id = p_blueprint_id)
    ),
    COALESCE(NULLIF(p_label, ''), 'Snapshot ' || to_char(now(), 'YYYY-MM-DD HH24:MI')),
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  );

  RETURN v_snapshot_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_blueprint_share(p_blueprint_id uuid, p_expires_at timestamptz DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_raw_token text;
  v_token text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT owner_id INTO v_owner FROM public.blueprints WHERE id = p_blueprint_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Blueprint introuvable';
  END IF;

  IF v_owner <> v_actor AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_actor
      AND p.user_type IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_raw_token := encode(gen_random_bytes(18), 'base64');
  v_token := translate(replace(replace(v_raw_token, '/', '_'), '+', '-'), '=', '');

  INSERT INTO public.blueprint_shares (blueprint_id, token, expires_at, metadata, created_at)
  VALUES (p_blueprint_id, v_token, p_expires_at, COALESCE(p_metadata, '{}'::jsonb), now())
  ON CONFLICT (token) DO NOTHING;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_blueprint_public(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blueprint_id uuid;
BEGIN
  SELECT blueprint_id
  INTO v_blueprint_id
  FROM public.blueprint_shares
  WHERE token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > now());

  IF v_blueprint_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'blueprint', (SELECT to_jsonb(b.*) - 'owner_id' FROM public.blueprints b WHERE b.id = v_blueprint_id),
    'nodes', (SELECT COALESCE(jsonb_agg(to_jsonb(n) - 'blueprint_id'), '[]'::jsonb) FROM public.blueprint_nodes n WHERE n.blueprint_id = v_blueprint_id),
    'edges', (SELECT COALESCE(jsonb_agg(to_jsonb(e) - 'blueprint_id'), '[]'::jsonb) FROM public.blueprint_edges e WHERE e.blueprint_id = v_blueprint_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_blueprints() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blueprint(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.blueprints_upsert_graph(uuid, text, text, text, jsonb, jsonb, jsonb, uuid[], uuid[], boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_blueprint(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_blueprint_snapshot(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_blueprint_share(uuid, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blueprint_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_blueprint_public(text) TO authenticated;

INSERT INTO public.component_rules (component_key, description, family, anonymous_state, guest_state, client_state, vip_state, prof_state, admin_state, display_order)
VALUES (
  'nav:client_blueprints',
  'Lien vers le builder Blueprint Notion dans la navigation',
  'Elements Globaux',
  'hidden',
  'hidden',
  'visible',
  'visible',
  'visible',
  'visible',
  135
)
ON CONFLICT (component_key) DO UPDATE
SET
  description = EXCLUDED.description,
  family = EXCLUDED.family,
  anonymous_state = EXCLUDED.anonymous_state,
  guest_state = EXCLUDED.guest_state,
  client_state = EXCLUDED.client_state,
  vip_state = EXCLUDED.vip_state,
  prof_state = EXCLUDED.prof_state,
  admin_state = EXCLUDED.admin_state,
  display_order = EXCLUDED.display_order;
INSERT INTO public.role_permissions (permission, description, family, client, prof, guest, admin, vip, display_order, created_at)
VALUES (
  'client_blueprints:view_module',
  'Accès au module Blueprint Notion (mindmap).',
  'Modules Clients',
  TRUE,
  FALSE,
  FALSE,
  TRUE,
  FALSE,
  320,
  now()
)
ON CONFLICT (permission) DO UPDATE
SET
  description = EXCLUDED.description,
  family = EXCLUDED.family,
  client = EXCLUDED.client,
  prof = EXCLUDED.prof,
  guest = EXCLUDED.guest,
  admin = EXCLUDED.admin,
  vip = EXCLUDED.vip,
  display_order = EXCLUDED.display_order;

INSERT INTO public.modules_registry (module_key, name, description, required_permission, is_active, default_layout, created_at, updated_at)
VALUES (
  'client_blueprints',
  'Blueprint Notion',
  'Composez un blueprint Notion sous forme de carte mentale.',
  'client_blueprints:view_module',
  TRUE,
  '{"span": 12, "order": 3}'::jsonb,
  now(),
  now()
)
ON CONFLICT (module_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required_permission = EXCLUDED.required_permission,
  is_active = EXCLUDED.is_active,
  default_layout = EXCLUDED.default_layout,
  updated_at = now();

COMMIT;






























