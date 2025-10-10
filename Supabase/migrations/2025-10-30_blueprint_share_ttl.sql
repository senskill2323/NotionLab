BEGIN;

-- Backfill expiration for existing blueprint shares and deactivate expired ones
UPDATE public.blueprint_shares
SET expires_at = COALESCE(expires_at, created_at + interval '7 days')
WHERE expires_at IS NULL;

UPDATE public.blueprint_shares
SET is_active = FALSE
WHERE is_active = TRUE
  AND expires_at IS NOT NULL
  AND expires_at <= now();

CREATE OR REPLACE FUNCTION public.create_blueprint_share(
  p_blueprint_id uuid,
  p_expires_at timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_raw_token text;
  v_token text;
  v_expires_at timestamptz := now() + interval '7 days';
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
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

  IF p_expires_at IS NOT NULL THEN
    v_expires_at := LEAST(p_expires_at, now() + interval '7 days');
  END IF;

  IF v_expires_at <= now() THEN
    v_expires_at := now() + interval '7 days';
  END IF;

  UPDATE public.blueprint_shares
  SET is_active = FALSE,
      expires_at = LEAST(COALESCE(expires_at, v_expires_at), now()),
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{revoked_reason}', to_jsonb('rotated'::text), true)
  WHERE blueprint_id = p_blueprint_id
    AND is_active = TRUE;

  v_raw_token := encode(gen_random_bytes(18), 'base64');
  v_token := translate(replace(replace(v_raw_token, '/', '_'), '+', '-'), '=', '');

  v_metadata := jsonb_set(v_metadata, '{ttl_days}', to_jsonb(7), true);
  v_metadata := jsonb_set(v_metadata, '{issued_at}', to_jsonb(now()), true);

  INSERT INTO public.blueprint_shares (blueprint_id, owner_id, token, expires_at, metadata, created_at)
  VALUES (p_blueprint_id, v_owner, v_token, v_expires_at, v_metadata, now())
  ON CONFLICT (token) DO NOTHING;

  RETURN jsonb_build_object(
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$function$;

COMMIT;
