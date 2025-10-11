BEGIN;

ALTER TABLE public.email_notifications
  ADD COLUMN IF NOT EXISTS "user-available" boolean NOT NULL DEFAULT false;

COMMIT;
