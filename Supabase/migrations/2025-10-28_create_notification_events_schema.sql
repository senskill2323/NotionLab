-- Notification Events Registry
-- This migration introduces the tables backing the event registry for transactional e-mails,
-- including row level security policies and admin permissions.

-- Ensure pgcrypto is available for gen_random_uuid (idempotent on re-run)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generic trigger helper to keep updated_at in sync (reusable)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Table storing the catalogue of events
CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT notification_events_event_key_unique UNIQUE(event_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_events_active
  ON public.notification_events (is_active);

DROP TRIGGER IF EXISTS trg_notification_events_set_updated_at ON public.notification_events;
CREATE TRIGGER trg_notification_events_set_updated_at
  BEFORE UPDATE ON public.notification_events
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- Table linking events to e-mail templates
CREATE TABLE IF NOT EXISTS public.notification_event_templates (
  event_id uuid NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.email_notifications(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT FALSE,
  priority smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT notification_event_templates_pk PRIMARY KEY (event_id, notification_id)
);

-- Guarantee a single primary template per event
CREATE UNIQUE INDEX IF NOT EXISTS notification_event_primary_template_idx
  ON public.notification_event_templates(event_id)
  WHERE is_primary IS TRUE;

CREATE INDEX IF NOT EXISTS notification_event_templates_notification_idx
  ON public.notification_event_templates(notification_id);

DROP TRIGGER IF EXISTS trg_notification_event_templates_set_updated_at ON public.notification_event_templates;
CREATE TRIGGER trg_notification_event_templates_set_updated_at
  BEFORE UPDATE ON public.notification_event_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- Optional helper view to inspect active mappings (idempotent)
CREATE OR REPLACE VIEW public.v_notification_event_mappings AS
SELECT
  ne.id AS event_id,
  ne.event_key,
  ne.label AS event_label,
  ne.description AS event_description,
  ne.is_active AS event_active,
  net.notification_id,
  en.notification_key,
  en.title AS notification_title,
  en.is_active AS notification_active,
  net.is_primary,
  net.priority,
  net.created_at AS link_created_at,
  net.updated_at AS link_updated_at
FROM public.notification_events ne
LEFT JOIN public.notification_event_templates net ON net.event_id = ne.id
LEFT JOIN public.email_notifications en ON en.id = net.notification_id;

-- Row Level Security
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notification_event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_event_templates FORCE ROW LEVEL SECURITY;

-- Clean up policies if migration rerun
DROP POLICY IF EXISTS "Admins can read notification events" ON public.notification_events;
DROP POLICY IF EXISTS "Admins can manage notification events" ON public.notification_events;
DROP POLICY IF EXISTS "Admins can read notification event templates" ON public.notification_event_templates;
DROP POLICY IF EXISTS "Admins can manage notification event templates" ON public.notification_event_templates;
DROP POLICY IF EXISTS "Service role can manage notification events" ON public.notification_events;
DROP POLICY IF EXISTS "Service role can manage notification event templates" ON public.notification_event_templates;

-- Admin / owner access
CREATE POLICY "Admins can read notification events"
  ON public.notification_events
  FOR SELECT
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can insert notification events"
  ON public.notification_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can update notification events"
  ON public.notification_events
  FOR UPDATE
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()))
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can delete notification events"
  ON public.notification_events
  FOR DELETE
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can read notification event templates"
  ON public.notification_event_templates
  FOR SELECT
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can insert notification event templates"
  ON public.notification_event_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can update notification event templates"
  ON public.notification_event_templates
  FOR UPDATE
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()))
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can delete notification event templates"
  ON public.notification_event_templates
  FOR DELETE
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()));

-- Explicitly allow the service role (used by Edge Functions) to bypass checks
CREATE POLICY "Service role can access notification events"
  ON public.notification_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can access notification event templates"
  ON public.notification_event_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permissions wiring for the admin dashboard
INSERT INTO public.role_permissions (
  permission,
  description,
  family,
  client,
  prof,
  guest,
  admin,
  vip,
  display_order,
  created_at
) VALUES (
  'admin:notification-events:view_module',
  'Accéder au registre des événements de notifications e-mail.',
  'Modules Admin',
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  FALSE,
  140,
  timezone('utc', now())
) ON CONFLICT (permission) DO UPDATE SET
  description   = EXCLUDED.description,
  family        = EXCLUDED.family,
  client        = EXCLUDED.client,
  prof          = EXCLUDED.prof,
  guest         = EXCLUDED.guest,
  admin         = EXCLUDED.admin,
  vip           = EXCLUDED.vip,
  display_order = EXCLUDED.display_order;

INSERT INTO public.role_permissions (
  permission,
  description,
  family,
  client,
  prof,
  guest,
  admin,
  vip,
  display_order,
  created_at
) VALUES (
  'admin:notification-events:edit',
  'Créer, modifier et supprimer les événements déclencheurs de notifications.',
  'Modules Admin',
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  FALSE,
  141,
  timezone('utc', now())
) ON CONFLICT (permission) DO UPDATE SET
  description   = EXCLUDED.description,
  family        = EXCLUDED.family,
  client        = EXCLUDED.client,
  prof          = EXCLUDED.prof,
  guest         = EXCLUDED.guest,
  admin         = EXCLUDED.admin,
  vip           = EXCLUDED.vip,
  display_order = EXCLUDED.display_order;
