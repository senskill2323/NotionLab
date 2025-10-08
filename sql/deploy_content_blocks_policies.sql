-- RLS cohérente sur content_blocks pour aligner le front public et l'admin.
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published home blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Admins can view all content blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Admins can insert content blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Admins can update content blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Admins can delete content blocks" ON public.content_blocks;

CREATE POLICY "Public can view published home blocks"
  ON public.content_blocks
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can view all content blocks"
  ON public.content_blocks
  FOR SELECT
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can insert content blocks"
  ON public.content_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can update content blocks"
  ON public.content_blocks
  FOR UPDATE
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()))
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Admins can delete content blocks"
  ON public.content_blocks
  FOR DELETE
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()));
