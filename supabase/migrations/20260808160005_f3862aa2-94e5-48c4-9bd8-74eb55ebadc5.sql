-- Trigger-only function: no API caller should execute it
REVOKE ALL ON FUNCTION public.handle_new_merchant_user() FROM PUBLIC, anon, authenticated;

-- RLS helper functions: needed by policy evaluation for signed-in users only
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.owns_merchant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_merchant(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.owns_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_customer(uuid) TO authenticated;

-- Demo claim requires a signed-in user
REVOKE ALL ON FUNCTION public.claim_demo_merchant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_demo_merchant() TO authenticated;

-- Public QR enrollment flow: intentionally callable by anonymous visitors
REVOKE ALL ON FUNCTION public.get_public_establishment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_establishment(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.register_customer_public(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_customer_public(text, text, text, text) TO anon, authenticated;

-- Make it explicit that roles can never be assigned from the app
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
DROP POLICY IF EXISTS "no client role writes" ON public.user_roles;
CREATE POLICY "no client role writes" ON public.user_roles
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (false);