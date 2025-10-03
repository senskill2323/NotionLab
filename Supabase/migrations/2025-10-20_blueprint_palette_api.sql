BEGIN;

DROP FUNCTION IF EXISTS public.get_blueprint_palette_catalog() CASCADE;
CREATE OR REPLACE FUNCTION public.get_blueprint_palette_catalog()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH family_data AS (
    SELECT
      f.id,
      f.label,
      f.description,
      f.sort_order,
      COALESCE(items.items, '[]'::jsonb) AS items
    FROM public.blueprint_palette_families f
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'familyId', i.family_id,
          'label', i.label,
          'description', i.description,
          'sortOrder', i.sort_order,
          'isActive', i.is_active
        )
        ORDER BY i.sort_order, i.label
      ) AS items
      FROM public.blueprint_palette_items i
      WHERE i.family_id = f.id
        AND i.is_active = TRUE
    ) AS items ON TRUE
    WHERE f.is_active = TRUE
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', fd.id,
        'label', fd.label,
        'description', fd.description,
        'sortOrder', fd.sort_order,
        'isActive', TRUE,
        'items', fd.items
      )
      ORDER BY fd.sort_order, fd.label
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM family_data fd;

  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.upsert_blueprint_palette_family(uuid, text, text, integer, boolean);
CREATE OR REPLACE FUNCTION public.upsert_blueprint_palette_family(
  p_family_id uuid DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_owner_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF p_family_id IS NULL THEN
    INSERT INTO public.blueprint_palette_families (label, description, sort_order, is_active)
    VALUES (
      COALESCE(NULLIF(p_label, ''), 'Sans titre'),
      p_description,
      COALESCE(p_sort_order, 0),
      COALESCE(p_is_active, TRUE)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.blueprint_palette_families
    SET
      label = COALESCE(NULLIF(p_label, ''), label),
      description = COALESCE(p_description, description),
      sort_order = COALESCE(p_sort_order, sort_order),
      is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_family_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Famille introuvable';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_blueprint_palette_family(uuid);
CREATE OR REPLACE FUNCTION public.delete_blueprint_palette_family(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  DELETE FROM public.blueprint_palette_families
  WHERE id = p_family_id;
END;
$$;

DROP FUNCTION IF EXISTS public.upsert_blueprint_palette_item(uuid, uuid, text, text, integer, boolean);
CREATE OR REPLACE FUNCTION public.upsert_blueprint_palette_item(
  p_item_id uuid DEFAULT NULL,
  p_family_id uuid DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_family uuid;
BEGIN
  IF NOT public.is_owner_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF p_item_id IS NULL THEN
    IF p_family_id IS NULL THEN
      RAISE EXCEPTION 'family_id requis pour créer un item';
    END IF;

    SELECT id INTO v_family FROM public.blueprint_palette_families WHERE id = p_family_id;
    IF v_family IS NULL THEN
      RAISE EXCEPTION 'Famille introuvable';
    END IF;

    INSERT INTO public.blueprint_palette_items (family_id, label, description, sort_order, is_active)
    VALUES (
      p_family_id,
      COALESCE(NULLIF(p_label, ''), 'Sans titre'),
      p_description,
      COALESCE(p_sort_order, 0),
      COALESCE(p_is_active, TRUE)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.blueprint_palette_items
    SET
      family_id = COALESCE(p_family_id, family_id),
      label = COALESCE(NULLIF(p_label, ''), label),
      description = COALESCE(p_description, description),
      sort_order = COALESCE(p_sort_order, sort_order),
      is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_item_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Item introuvable';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_blueprint_palette_item(uuid);
CREATE OR REPLACE FUNCTION public.delete_blueprint_palette_item(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  DELETE FROM public.blueprint_palette_items
  WHERE id = p_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_blueprint_palette_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_blueprint_palette_family(uuid, text, text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_blueprint_palette_family(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_blueprint_palette_item(uuid, uuid, text, text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_blueprint_palette_item(uuid) TO authenticated;

INSERT INTO public.role_permissions (permission, description, family, client, prof, guest, admin, vip, display_order, created_at)
VALUES (
  'admin_blueprints:manage_palette',
  'Acc�s complet � la gestion de la palette Blueprint.',
  'Blueprints',
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  FALSE,
  520,
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

INSERT INTO public.component_rules (component_key, description, family, anonymous_state, guest_state, client_state, vip_state, prof_state, admin_state, display_order)
VALUES (
  'nav:admin_blueprint_palette',
  'Acc�s navigation admin vers la gestion de la palette Blueprint.',
  'Navigation Admin',
  'hidden',
  'hidden',
  'hidden',
  'hidden',
  'hidden',
  'visible',
  460
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

COMMIT;