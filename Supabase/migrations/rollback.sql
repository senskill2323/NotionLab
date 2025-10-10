BEGIN;

CREATE OR REPLACE FUNCTION public.rename_blueprint_with_version(
  p_blueprint_id uuid,
  p_next_title text,
  p_expected_autosave_version integer
)
RETURNS TABLE (
  blueprint_id uuid,
  autosave_version integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_current_version integer;
  v_next_title text := COALESCE(NULLIF(p_next_title, ''), 'Blueprint sans titre');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT owner_id, autosave_version
  INTO v_owner, v_current_version
  FROM public.blueprints
  WHERE id = p_blueprint_id
  FOR UPDATE;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Blueprint introuvable';
  END IF;

  IF v_owner <> v_actor AND NOT public.is_owner_or_admin(v_actor) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  IF p_expected_autosave_version IS NOT NULL AND p_expected_autosave_version <> v_current_version THEN
    PERFORM set_config('response.status', '409', true);
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Autosave conflict detected',
      DETAIL = format('expected version %s but found %s', p_expected_autosave_version, v_current_version);
  END IF;

  UPDATE public.blueprints
  SET title = v_next_title,
      autosave_version = v_current_version + 1,
      updated_at = now()
  WHERE id = p_blueprint_id;

  RETURN QUERY
  SELECT p_blueprint_id, v_current_version + 1;
END;
$function$;

COMMIT;
