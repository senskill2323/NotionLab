BEGIN;

CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  subject text NOT NULL,
  preview_text text,
  body_html text NOT NULL,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  force_send boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  default_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_notifications_key_idx ON public.email_notifications(notification_key);
CREATE INDEX IF NOT EXISTS email_notifications_active_idx ON public.email_notifications(is_active);

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_email_notifications_set_updated_at ON public.email_notifications;
CREATE TRIGGER trg_email_notifications_set_updated_at
  BEFORE UPDATE ON public.email_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS email_notifications_select ON public.email_notifications;
CREATE POLICY email_notifications_select
  ON public.email_notifications
  FOR SELECT
  TO authenticated
  USING (
    is_active IS TRUE
    OR public.is_admin_or_owner(auth.uid())
  );

DROP POLICY IF EXISTS email_notifications_insert ON public.email_notifications;
CREATE POLICY email_notifications_insert
  ON public.email_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS email_notifications_update ON public.email_notifications;
CREATE POLICY email_notifications_update
  ON public.email_notifications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS email_notifications_delete ON public.email_notifications;
CREATE POLICY email_notifications_delete
  ON public.email_notifications
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

GRANT SELECT ON public.email_notifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.email_notifications TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_email_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.email_notifications(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS user_email_notification_preferences_notification_idx
  ON public.user_email_notification_preferences(notification_id);

ALTER TABLE public.user_email_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_user_email_notification_preferences_updated_at ON public.user_email_notification_preferences;
CREATE TRIGGER trg_user_email_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_email_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS user_notification_preferences_select ON public.user_email_notification_preferences;
CREATE POLICY user_notification_preferences_select
  ON public.user_email_notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin_or_owner(auth.uid())
  );

DROP POLICY IF EXISTS user_notification_preferences_insert ON public.user_email_notification_preferences;
CREATE POLICY user_notification_preferences_insert
  ON public.user_email_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin_or_owner(auth.uid())
  );

DROP POLICY IF EXISTS user_notification_preferences_update ON public.user_email_notification_preferences;
CREATE POLICY user_notification_preferences_update
  ON public.user_email_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin_or_owner(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin_or_owner(auth.uid())
  );

DROP POLICY IF EXISTS user_notification_preferences_delete ON public.user_email_notification_preferences;
CREATE POLICY user_notification_preferences_delete
  ON public.user_email_notification_preferences
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin_or_owner(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_email_notification_preferences TO authenticated;

INSERT INTO public.role_permissions (permission, description, client, vip, admin, prof, guest, family, display_order)
VALUES (
  'admin:manage_email_notifications',
  'Gerer les notifications email envoyees par la plateforme.',
  false,
  false,
  true,
  false,
  false,
  'admin',
  240
)
ON CONFLICT (permission) DO UPDATE
SET
  description = EXCLUDED.description,
  client = EXCLUDED.client,
  vip = EXCLUDED.vip,
  admin = EXCLUDED.admin,
  prof = EXCLUDED.prof,
  guest = EXCLUDED.guest,
  family = EXCLUDED.family,
  display_order = EXCLUDED.display_order;

DO $$
DECLARE target_row integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_dashboard_tabs WHERE tab_id = 'email_notifications'
  ) THEN
    SELECT COALESCE(MAX(row_order), -1) + 1 INTO target_row FROM public.admin_dashboard_tabs;

    INSERT INTO public.admin_dashboard_tabs (tab_id, label, icon, row_order, col_order, permission_required)
    VALUES ('email_notifications', 'Notifications', 'Mail', target_row, 0, 'admin:manage_email_notifications');
  ELSE
    UPDATE public.admin_dashboard_tabs
    SET
      label = 'Notifications',
      icon = 'Mail',
      permission_required = 'admin:manage_email_notifications'
    WHERE tab_id = 'email_notifications';
  END IF;
END
$$;

INSERT INTO public.admin_modules_registry (module_key, tab_id, component_name, label, description, icon, display_order, is_active, updated_at)
VALUES (
  'admin_email_notifications',
  'email_notifications',
  'EmailNotificationsPanel',
  'Notifications email',
  'Configurer les gabarits et statuts des notifications envoyees aux utilisateurs.',
  'Mail',
  1,
  TRUE,
  now()
)
ON CONFLICT (module_key) DO UPDATE
SET
  tab_id = EXCLUDED.tab_id,
  component_name = EXCLUDED.component_name,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
