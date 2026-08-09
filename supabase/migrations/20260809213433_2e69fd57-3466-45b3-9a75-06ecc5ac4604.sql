CREATE TABLE public.admin_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  endpoint text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_push_subscriptions TO authenticated;
GRANT ALL ON public.admin_push_subscriptions TO service_role;

ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage own push subscriptions"
ON public.admin_push_subscriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());