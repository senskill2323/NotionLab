-- Table: public.testimonials
-- Cette migration cree la table de stockage des temoignages utilisateurs
-- et configure les politiques RLS pour l'usage public et l'administration.

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT,
  content TEXT NOT NULL,
  rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.testimonials IS 'Avis laissés par les utilisateurs depuis le bloc home.testimonials.';

CREATE INDEX IF NOT EXISTS idx_testimonials_public_created_at
  ON public.testimonials (is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_testimonials_user_id
  ON public.testimonials (user_id);

-- Trigger pour maintenir updated_at a NOW() lors des modifications
CREATE OR REPLACE FUNCTION public.set_testimonials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_testimonials_set_updated_at ON public.testimonials;
CREATE TRIGGER trg_testimonials_set_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_testimonials_updated_at();

-- Activer la sécurité RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials FORCE ROW LEVEL SECURITY;

-- Nettoyage des politiques existantes si la migration est rejouee
DROP POLICY IF EXISTS "Public can view published testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can view all testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Authenticated users can insert testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can update testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can delete testimonials" ON public.testimonials;

-- Lecture publique des temoignages publies
CREATE POLICY "Public can view published testimonials"
  ON public.testimonials
  FOR SELECT
  USING (is_public = TRUE);

-- Lecture elargie pour owners/admins
CREATE POLICY "Admins can view all testimonials"
  ON public.testimonials
  FOR SELECT
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()));

-- Insertion par les utilisateurs authentifies (user_id doit correspondre a auth.uid())
CREATE POLICY "Authenticated users can insert testimonials"
  ON public.testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Mise a jour par les owners/admins
CREATE POLICY "Admins can update testimonials"
  ON public.testimonials
  FOR UPDATE
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()))
  WITH CHECK (public.is_owner_or_admin(auth.uid()));

-- Suppression reservee aux owners/admins
CREATE POLICY "Admins can delete testimonials"
  ON public.testimonials
  FOR DELETE
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid()));

-- Pre-chargement des temoignages de demonstration (correspondent aux fallback du front)
INSERT INTO public.testimonials (user_id, author_name, author_role, rating, content, is_public)
VALUES
  (
    NULL,
    'Marie Dupont',
    'Fondatrice, Studio Lueur',
    5,
    'Une experience fluide et un accompagnement tres humain. Le module de formation nous a permis de structurer toute notre activite en quelques jours.',
    TRUE
  ),
  (
    NULL,
    'Alexandre Martin',
    'COO, HexaTech',
    5,
    'NotionLab a transforme notre maniere de collaborer. Les playbooks sont concrets et directement actionnables par toute l equipe.',
    TRUE
  ),
  (
    NULL,
    'Sonia Leroy',
    'Responsable Ops, Nova Conseil',
    4,
    'Des contenus de tres grande qualite et une equipe reactive. Nous avons collecte des retours clients x2 en un mois.',
    TRUE
  )
ON CONFLICT DO NOTHING;
