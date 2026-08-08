-- establishments public code
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS public_code text;
UPDATE public.establishments SET public_code = replace(gen_random_uuid()::text,'-','') WHERE public_code IS NULL;
ALTER TABLE public.establishments ALTER COLUMN public_code SET NOT NULL;
ALTER TABLE public.establishments ALTER COLUMN public_code SET DEFAULT replace(gen_random_uuid()::text,'-','');
CREATE UNIQUE INDEX IF NOT EXISTS establishments_public_code_key ON public.establishments(public_code);

-- customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS prenom text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL;

-- loyalty card reward mode
ALTER TABLE public.loyalty_cards ADD COLUMN IF NOT EXISTS mode_recompense text NOT NULL DEFAULT 'passages';
ALTER TABLE public.loyalty_cards ADD COLUMN IF NOT EXISTS montant_pour_recompense numeric(10,2) NOT NULL DEFAULT 100;
ALTER TABLE public.loyalty_cards DROP CONSTRAINT IF EXISTS loyalty_cards_mode_recompense_check;
ALTER TABLE public.loyalty_cards ADD CONSTRAINT loyalty_cards_mode_recompense_check CHECK (mode_recompense IN ('passages','montant'));

-- points history amount
ALTER TABLE public.points_history ADD COLUMN IF NOT EXISTS montant numeric(10,2) NOT NULL DEFAULT 0;

-- public establishment info for the signup landing page
CREATE OR REPLACE FUNCTION public.get_public_establishment(_code text)
RETURNS TABLE (establishment_id uuid, establishment_nom text, nom_commerce text, logo_url text, couleur_marque text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.nom, m.nom_commerce, m.logo_url, m.couleur_marque
  FROM public.establishments e
  JOIN public.merchants m ON m.id = e.merchant_id
  WHERE e.public_code = _code
  LIMIT 1
$$;

-- public self-registration through the establishment QR code
CREATE OR REPLACE FUNCTION public.register_customer_public(
  _code text,
  _nom text,
  _prenom text,
  _telephone text
) RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _est public.establishments%ROWTYPE;
  _existing uuid;
  _new uuid;
BEGIN
  SELECT * INTO _est FROM public.establishments WHERE public_code = _code;
  IF _est.id IS NULL THEN
    RAISE EXCEPTION 'Établissement introuvable';
  END IF;
  IF coalesce(trim(_nom),'') = '' OR coalesce(trim(_telephone),'') = '' THEN
    RAISE EXCEPTION 'Nom et téléphone requis';
  END IF;

  SELECT id INTO _existing FROM public.customers
   WHERE merchant_id = _est.merchant_id AND telephone = trim(_telephone)
   LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  INSERT INTO public.customers (merchant_id, establishment_id, nom, prenom, telephone)
  VALUES (_est.merchant_id, _est.id, trim(_nom), nullif(trim(_prenom),''), trim(_telephone))
  RETURNING id INTO _new;
  RETURN _new;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_establishment(text) FROM public;
REVOKE ALL ON FUNCTION public.register_customer_public(text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_establishment(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_customer_public(text,text,text,text) TO anon, authenticated, service_role;