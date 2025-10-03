BEGIN;

CREATE TABLE IF NOT EXISTS public.blueprint_palette_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blueprint_palette_families_active_sort_idx
  ON public.blueprint_palette_families(is_active, sort_order);

ALTER TABLE public.blueprint_palette_families ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_blueprint_palette_families_set_updated_at ON public.blueprint_palette_families;
CREATE TRIGGER trg_blueprint_palette_families_set_updated_at
  BEFORE UPDATE ON public.blueprint_palette_families
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.blueprint_palette_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.blueprint_palette_families(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blueprint_palette_items_family_sort_idx
  ON public.blueprint_palette_items(family_id, sort_order);

ALTER TABLE public.blueprint_palette_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_blueprint_palette_items_set_updated_at ON public.blueprint_palette_items;
CREATE TRIGGER trg_blueprint_palette_items_set_updated_at
  BEFORE UPDATE ON public.blueprint_palette_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_palette_families TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_palette_items TO authenticated;

DROP POLICY IF EXISTS blueprint_palette_families_read ON public.blueprint_palette_families;
CREATE POLICY blueprint_palette_families_read ON public.blueprint_palette_families
  FOR SELECT
  TO authenticated
  USING (is_active OR public.is_owner_or_admin(auth.uid()));

DROP POLICY IF EXISTS blueprint_palette_families_manage ON public.blueprint_palette_families;
CREATE POLICY blueprint_palette_families_manage ON public.blueprint_palette_families
  FOR ALL
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()))
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

DROP POLICY IF EXISTS blueprint_palette_items_read ON public.blueprint_palette_items;
CREATE POLICY blueprint_palette_items_read ON public.blueprint_palette_items
  FOR SELECT
  TO authenticated
  USING (is_active OR public.is_owner_or_admin(auth.uid()));

DROP POLICY IF EXISTS blueprint_palette_items_manage ON public.blueprint_palette_items;
CREATE POLICY blueprint_palette_items_manage ON public.blueprint_palette_items
  FOR ALL
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()))
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

COMMIT;