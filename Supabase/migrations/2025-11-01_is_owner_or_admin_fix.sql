BEGIN;

-- Align owner/admin detection with user_type_id while keeping legacy user_type values.
CREATE OR REPLACE FUNCTION public.is_owner_or_admin(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.user_types ut ON ut.id = p.user_type_id
    WHERE p.id = p_user
      AND (
        p.user_type IN ('owner', 'admin')
        OR ut.type_name IN ('owner', 'admin')
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.is_owner_or_admin(uuid) TO authenticated;

-- Keep both columns in sync so existing logic depending on user_type keeps working.
UPDATE public.profiles AS p
SET user_type = ut.type_name
FROM public.user_types AS ut
WHERE ut.id = p.user_type_id
  AND (
    p.user_type IS DISTINCT FROM ut.type_name
    OR p.user_type IS NULL
  );

COMMIT;
