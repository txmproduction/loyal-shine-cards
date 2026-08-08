ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS employees_user_id_key ON public.employees(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.employee_merchant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT merchant_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.employee_merchant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.employee_merchant_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_merchant_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  m_id uuid;
  v_nom text;
begin
  if coalesce(new.raw_user_meta_data ->> 'is_employee', 'false') = 'true' then
    return new;
  end if;

  v_nom := coalesce(new.raw_user_meta_data ->> 'nom_commerce', split_part(new.email, '@', 1));
  insert into public.merchants (user_id, nom_commerce, email)
  values (new.id, v_nom, new.email)
  on conflict (email) do nothing
  returning id into m_id;

  if m_id is not null then
    insert into public.establishments (merchant_id, nom) values (m_id, v_nom || ' — Principal');
    insert into public.loyalty_cards (merchant_id, nb_points_pour_recompense, valeur_recompense)
    values (m_id, 10, 'Récompense offerte');
  end if;
  return new;
end;
$function$;

-- Employee read access
CREATE POLICY "employee reads own merchant" ON public.merchants
  FOR SELECT TO authenticated USING (id = public.employee_merchant_id());

CREATE POLICY "employee reads own row" ON public.employees
  FOR SELECT TO authenticated USING (merchant_id = public.employee_merchant_id());

CREATE POLICY "employee reads loyalty card" ON public.loyalty_cards
  FOR SELECT TO authenticated USING (merchant_id = public.employee_merchant_id());

CREATE POLICY "employee reads establishments" ON public.establishments
  FOR SELECT TO authenticated USING (merchant_id = public.employee_merchant_id());

CREATE POLICY "employee reads customers" ON public.customers
  FOR SELECT TO authenticated USING (merchant_id = public.employee_merchant_id());

CREATE POLICY "employee creates customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (merchant_id = public.employee_merchant_id());

CREATE POLICY "employee reads points" ON public.points_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.customers c
            WHERE c.id = points_history.customer_id
              AND c.merchant_id = public.employee_merchant_id())
  );

CREATE POLICY "employee adds points" ON public.points_history
  FOR INSERT TO authenticated WITH CHECK (
    employee_id = public.current_employee_id()
    AND EXISTS (SELECT 1 FROM public.customers c
                WHERE c.id = points_history.customer_id
                  AND c.merchant_id = public.employee_merchant_id())
  );

CREATE POLICY "employee reads rewards" ON public.rewards_redeemed
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.customers c
            WHERE c.id = rewards_redeemed.customer_id
              AND c.merchant_id = public.employee_merchant_id())
  );

CREATE POLICY "employee redeems rewards" ON public.rewards_redeemed
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.customers c
            WHERE c.id = rewards_redeemed.customer_id
              AND c.merchant_id = public.employee_merchant_id())
  );