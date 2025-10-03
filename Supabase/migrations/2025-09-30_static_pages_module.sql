BEGIN;

CREATE TABLE IF NOT EXISTS public.static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text,
  seo_description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS static_pages_status_idx ON public.static_pages(status);
CREATE INDEX IF NOT EXISTS static_pages_slug_idx ON public.static_pages(slug);

ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_static_pages_set_updated_at ON public.static_pages;
CREATE TRIGGER trg_static_pages_set_updated_at
  BEFORE UPDATE ON public.static_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'static_pages' AND policyname = 'static_pages_public_read'
  ) THEN
    EXECUTE $$CREATE POLICY static_pages_public_read ON public.static_pages
      FOR SELECT
      USING (status = 'published')$$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'static_pages' AND policyname = 'static_pages_admin_manage'
  ) THEN
    EXECUTE $$CREATE POLICY static_pages_admin_manage ON public.static_pages
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.user_type IN ('owner', 'admin', 'prof')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.user_type IN ('owner', 'admin', 'prof')
        )
      )$$;
  END IF;
END
$$;

GRANT SELECT ON public.static_pages TO anon;
GRANT SELECT ON public.static_pages TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.static_pages TO authenticated;

INSERT INTO public.role_permissions (permission, description, client, vip, admin, prof, guest, family, display_order)
VALUES (
  'admin:manage_static_pages',
  'Gerer les pages statiques dans le back-office.',
  false,
  false,
  true,
  false,
  false,
  'admin',
  215
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
DECLARE next_row integer;
BEGIN
  SELECT COALESCE(MAX(row_order), 0) + 1 INTO next_row FROM public.admin_dashboard_tabs;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_dashboard_tabs WHERE tab_id = 'static_pages'
  ) THEN
    INSERT INTO public.admin_dashboard_tabs (tab_id, label, icon, row_order, col_order, permission_required)
    VALUES ('static_pages', 'Pages statiques', 'FileText', next_row, 1, 'admin:manage_static_pages');
  ELSE
    UPDATE public.admin_dashboard_tabs
    SET permission_required = 'admin:manage_static_pages'
    WHERE tab_id = 'static_pages';
  END IF;
END
$$;

INSERT INTO public.admin_modules_registry (module_key, tab_id, component_name, label, description, icon, display_order, is_active, updated_at)
VALUES (
  'admin_static_pages',
  'static_pages',
  'StaticPageManagementPanel',
  'Pages statiques',
  'Administrer le contenu des pages statiques.',
  'FileText',
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
