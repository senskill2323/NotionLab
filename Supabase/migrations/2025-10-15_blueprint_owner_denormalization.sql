BEGIN;

ALTER TABLE public.blueprint_nodes ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.blueprint_edges ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.blueprint_snapshots ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.blueprint_shares ADD COLUMN IF NOT EXISTS owner_id uuid;

UPDATE public.blueprint_nodes n
SET owner_id = b.owner_id
FROM public.blueprints b
WHERE n.blueprint_id = b.id
  AND (n.owner_id IS DISTINCT FROM b.owner_id OR n.owner_id IS NULL);

UPDATE public.blueprint_edges e
SET owner_id = b.owner_id
FROM public.blueprints b
WHERE e.blueprint_id = b.id
  AND (e.owner_id IS DISTINCT FROM b.owner_id OR e.owner_id IS NULL);

UPDATE public.blueprint_snapshots s
SET owner_id = b.owner_id
FROM public.blueprints b
WHERE s.blueprint_id = b.id
  AND (s.owner_id IS DISTINCT FROM b.owner_id OR s.owner_id IS NULL);

UPDATE public.blueprint_shares sh
SET owner_id = b.owner_id
FROM public.blueprints b
WHERE sh.blueprint_id = b.id
  AND (sh.owner_id IS DISTINCT FROM b.owner_id OR sh.owner_id IS NULL);

ALTER TABLE public.blueprint_nodes ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.blueprint_edges ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.blueprint_snapshots ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.blueprint_shares ALTER COLUMN owner_id SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.blueprint_nodes
    ADD CONSTRAINT blueprint_nodes_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.blueprint_edges
    ADD CONSTRAINT blueprint_edges_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.blueprint_snapshots
    ADD CONSTRAINT blueprint_snapshots_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.blueprint_shares
    ADD CONSTRAINT blueprint_shares_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS blueprint_nodes_owner_id_idx ON public.blueprint_nodes(owner_id);
CREATE INDEX IF NOT EXISTS blueprint_edges_owner_id_idx ON public.blueprint_edges(owner_id);
CREATE INDEX IF NOT EXISTS blueprint_snapshots_owner_id_idx ON public.blueprint_snapshots(owner_id);
CREATE INDEX IF NOT EXISTS blueprint_shares_owner_id_idx ON public.blueprint_shares(owner_id);

CREATE OR REPLACE FUNCTION public.is_owner_or_admin(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user
      AND user_type IN ('owner','admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_owner_or_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS blueprint_nodes_manage ON public.blueprint_nodes;
CREATE POLICY blueprint_nodes_manage ON public.blueprint_nodes
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR public.is_owner_or_admin(auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_owner_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS blueprint_edges_manage ON public.blueprint_edges;
CREATE POLICY blueprint_edges_manage ON public.blueprint_edges
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR public.is_owner_or_admin(auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_owner_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS blueprint_snapshots_manage ON public.blueprint_snapshots;
CREATE POLICY blueprint_snapshots_manage ON public.blueprint_snapshots
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR public.is_owner_or_admin(auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_owner_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS blueprint_shares_manage ON public.blueprint_shares;
CREATE POLICY blueprint_shares_manage ON public.blueprint_shares
  FOR ALL
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_owner_or_admin(auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_owner_or_admin(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.get_blueprint(p_blueprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $function$
DECLARE
  v_blueprint jsonb;
BEGIN
  SELECT to_jsonb(b.*)
  INTO v_blueprint
  FROM public.blueprints b
  WHERE b.id = p_blueprint_id
    AND (
      b.owner_id = auth.uid()
      OR public.is_owner_or_admin(auth.uid())
    );

  IF v_blueprint IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'blueprint', v_blueprint,
    'nodes', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(n) - 'blueprint_id' - 'owner_id')
        FROM public.blueprint_nodes n
        WHERE n.blueprint_id = p_blueprint_id
      ),
      '[]'::jsonb
    ),
    'edges', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(e) - 'blueprint_id' - 'owner_id')
        FROM public.blueprint_edges e
        WHERE e.blueprint_id = p_blueprint_id
      ),
      '[]'::jsonb
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.blueprints_upsert_graph(
  p_blueprint_id uuid,
  p_title text,
  p_description text,
  p_status text,
  p_metadata jsonb,
  p_nodes jsonb,
  p_edges jsonb,
  p_autosave boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_blueprint_id uuid;
  v_owner uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_blueprint_id IS NULL THEN
    v_blueprint_id := gen_random_uuid();
    v_owner := v_actor;
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
    SELECT owner_id INTO v_owner
    FROM public.blueprints
    WHERE id = v_blueprint_id
    FOR UPDATE;

    IF v_owner IS NULL THEN
      RAISE EXCEPTION 'Blueprint introuvable';
    END IF;

    IF v_owner <> v_actor AND NOT public.is_owner_or_admin(v_actor) THEN
      RAISE EXCEPTION 'Acces refuse';
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
      owner_id,
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
      v_owner,
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
        owner_id = EXCLUDED.owner_id,
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

    DELETE FROM public.blueprint_nodes
    WHERE blueprint_id = v_blueprint_id
      AND id NOT IN (
        SELECT (node->>'id')::uuid FROM jsonb_array_elements(p_nodes) AS node
        WHERE (node->>'id') IS NOT NULL
      );
  END IF;

  IF p_edges IS NOT NULL THEN
    INSERT INTO public.blueprint_edges (
      id,
      blueprint_id,
      owner_id,
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
      v_owner,
      (edge->>'source')::uuid,
      (edge->>'target')::uuid,
      edge->>'label',
      COALESCE(edge->'metadata', '{}'::jsonb),
      now(),
      now()
    FROM jsonb_array_elements(p_edges) AS edge
    ON CONFLICT (id) DO UPDATE
      SET
        owner_id = EXCLUDED.owner_id,
        source = EXCLUDED.source,
        target = EXCLUDED.target,
        label = EXCLUDED.label,
        metadata = EXCLUDED.metadata,
        updated_at = now();

    DELETE FROM public.blueprint_edges
    WHERE blueprint_id = v_blueprint_id
      AND id NOT IN (
        SELECT (edge->>'id')::uuid FROM jsonb_array_elements(p_edges) AS edge
        WHERE (edge->>'id') IS NOT NULL
      );
  END IF;

  RETURN v_blueprint_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.duplicate_blueprint(p_blueprint_id uuid, p_new_title text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  IF v_owner <> v_actor AND NOT public.is_owner_or_admin(v_actor) THEN
    RAISE EXCEPTION 'Acces refuse';
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

  INSERT INTO public.blueprint_nodes (id, blueprint_id, owner_id, type, title, family, subfamily, element_key, position_x, position_y, radius, fields, metadata, created_at, updated_at)
  SELECT
    map.new_id,
    v_new_id,
    v_actor,
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

  INSERT INTO public.blueprint_edges (id, blueprint_id, owner_id, source, target, label, metadata, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    v_new_id,
    v_actor,
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
$function$;

CREATE OR REPLACE FUNCTION public.create_blueprint_snapshot(p_blueprint_id uuid, p_label text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  IF v_owner <> v_actor AND NOT public.is_owner_or_admin(v_actor) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  INSERT INTO public.blueprint_snapshots (id, blueprint_id, owner_id, author_id, payload, label, metadata, created_at)
  VALUES (
    v_snapshot_id,
    p_blueprint_id,
    v_owner,
    v_actor,
    jsonb_build_object(
      'blueprint', (SELECT to_jsonb(b.*) FROM public.blueprints b WHERE b.id = p_blueprint_id),
      'nodes', (SELECT COALESCE(jsonb_agg(to_jsonb(n) - 'blueprint_id' - 'owner_id'), '[]'::jsonb) FROM public.blueprint_nodes n WHERE n.blueprint_id = p_blueprint_id),
      'edges', (SELECT COALESCE(jsonb_agg(to_jsonb(e) - 'blueprint_id' - 'owner_id'), '[]'::jsonb) FROM public.blueprint_edges e WHERE e.blueprint_id = p_blueprint_id)
    ),
    COALESCE(NULLIF(p_label, ''), 'Snapshot ' || to_char(now(), 'YYYY-MM-DD HH24:MI')),
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  );

  RETURN v_snapshot_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_blueprint_share(p_blueprint_id uuid, p_expires_at timestamptz DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  IF v_owner <> v_actor AND NOT public.is_owner_or_admin(v_actor) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  v_raw_token := encode(gen_random_bytes(18), 'base64');
  v_token := translate(replace(replace(v_raw_token, '/', '_'), '+', '-'), '=', '');

  INSERT INTO public.blueprint_shares (blueprint_id, owner_id, token, expires_at, metadata, created_at)
  VALUES (p_blueprint_id, v_owner, v_token, p_expires_at, COALESCE(p_metadata, '{}'::jsonb), now())
  ON CONFLICT (token) DO NOTHING;

  RETURN v_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_blueprint_public(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    'nodes', (SELECT COALESCE(jsonb_agg(to_jsonb(n) - 'blueprint_id' - 'owner_id'), '[]'::jsonb) FROM public.blueprint_nodes n WHERE n.blueprint_id = v_blueprint_id),
    'edges', (SELECT COALESCE(jsonb_agg(to_jsonb(e) - 'blueprint_id' - 'owner_id'), '[]'::jsonb) FROM public.blueprint_edges e WHERE e.blueprint_id = v_blueprint_id)
  );
END;
$function$;

COMMIT;
