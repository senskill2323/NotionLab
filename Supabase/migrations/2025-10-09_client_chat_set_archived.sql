-- Client live chat: secure archive toggle for clients
DROP FUNCTION IF EXISTS public.client_chat_set_archived(uuid, boolean);

CREATE OR REPLACE FUNCTION public.client_chat_set_archived(p_conversation_id uuid, p_archived boolean DEFAULT true)
RETURNS public.chat_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_auth_email text := auth.email();
  v_profile_guest_id uuid;
  v_is_authorized boolean := false;
  v_conversation public.chat_conversations;
  v_new_status text := CASE WHEN coalesce(p_archived, false) THEN 'resolu' ELSE 'ouvert' END;
BEGIN
  IF p_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Conversation id is required.';
  END IF;

  IF v_auth_user_id IS NULL AND v_auth_email IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifie.';
  END IF;

  SELECT *
    INTO v_conversation
    FROM public.chat_conversations
   WHERE id = p_conversation_id;

  IF v_conversation.id IS NULL THEN
    RAISE EXCEPTION 'Conversation introuvable.';
  END IF;

  IF v_auth_user_id IS NOT NULL AND v_conversation.guest_id = v_auth_user_id THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized AND v_auth_user_id IS NOT NULL THEN
    BEGIN
      SELECT chat_guest_id
        INTO v_profile_guest_id
        FROM public.profiles
       WHERE id = v_auth_user_id;
    EXCEPTION
      WHEN undefined_column THEN
        v_profile_guest_id := NULL;
    END;

    IF v_profile_guest_id IS NOT NULL AND v_conversation.guest_id = v_profile_guest_id THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized AND v_auth_email IS NOT NULL AND v_conversation.guest_email IS NOT NULL THEN
    IF lower(v_conversation.guest_email) = lower(v_auth_email) THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Conversation non autorisee.';
  END IF;

  UPDATE public.chat_conversations
     SET client_archived = coalesce(p_archived, false),
         status = v_new_status,
         updated_at = now()
   WHERE id = p_conversation_id
   RETURNING * INTO v_conversation;

  RETURN v_conversation;
END;
$$;

REVOKE ALL ON FUNCTION public.client_chat_set_archived(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.client_chat_set_archived(uuid, boolean) TO authenticated;
