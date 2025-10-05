BEGIN;

REVOKE SELECT ON public.blueprint_shares FROM anon;

DROP POLICY IF EXISTS blueprint_shares_read_public ON public.blueprint_shares;
CREATE POLICY blueprint_shares_read_public_token ON public.blueprint_shares
  FOR SELECT
  TO anon
  USING (
    is_active = TRUE
    AND (expires_at IS NULL OR expires_at > now())
    AND current_setting('request.headers.x-blueprint-token', true) IS NOT NULL
    AND token = current_setting('request.headers.x-blueprint-token', true)
  );

COMMIT;