-- Backfill Kanban statuses for all already-approved submissions (idempotent)

-- Uses init_kanban_statuses_for_submission(uuid) which is SECURITY DEFINER

-- Variant A': formation_submissions (plural)
DO $$
DECLARE rec record;
BEGIN
  IF to_regclass('public.formation_submissions') IS NOT NULL THEN
    -- Iterate all submissions (approval check is inside init function)
    FOR rec IN
      SELECT id FROM public.formation_submissions
    LOOP
      PERFORM public.init_kanban_statuses_for_submission(rec.id);
    END LOOP;
  END IF;
END$$;

-- Variant A: formation_submission
DO $$
DECLARE rec record;
BEGIN
  IF to_regclass('public.formation_submission') IS NOT NULL THEN
    -- Iterate approved submissions
    FOR rec IN
      SELECT id FROM public.formation_submission
    LOOP
      PERFORM public.init_kanban_statuses_for_submission(rec.id);
    END LOOP;
  END IF;
END$$;

-- Variant B: user_formation_submissions
DO $$
DECLARE rec record;
BEGIN
  IF to_regclass('public.user_formation_submissions') IS NOT NULL THEN
    -- Iterate approved submissions
    FOR rec IN
      SELECT id FROM public.user_formation_submissions
    LOOP
      PERFORM public.init_kanban_statuses_for_submission(rec.id);
    END LOOP;
  END IF;
END$$;
