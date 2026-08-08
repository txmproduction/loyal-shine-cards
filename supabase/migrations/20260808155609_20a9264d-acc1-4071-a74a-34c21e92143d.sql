ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'trial';

ALTER TABLE public.merchants DROP CONSTRAINT IF EXISTS merchants_access_status_check;
ALTER TABLE public.merchants ADD CONSTRAINT merchants_access_status_check
  CHECK (access_status IN ('trial','active','suspended'));

DROP POLICY IF EXISTS "admins manage merchants" ON public.merchants;
CREATE POLICY "admins manage merchants" ON public.merchants
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "establishments owner all" ON public.establishments;
CREATE POLICY "establishments owner read" ON public.establishments
  FOR SELECT TO authenticated USING (owns_merchant(merchant_id));
CREATE POLICY "establishments owner update" ON public.establishments
  FOR UPDATE TO authenticated USING (owns_merchant(merchant_id)) WITH CHECK (owns_merchant(merchant_id));
CREATE POLICY "establishments admin insert" ON public.establishments
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "establishments admin delete" ON public.establishments
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));