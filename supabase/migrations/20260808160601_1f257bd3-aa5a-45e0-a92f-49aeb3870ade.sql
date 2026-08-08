DROP FUNCTION IF EXISTS public.get_public_establishment(text);

CREATE FUNCTION public.get_public_establishment(_code text)
RETURNS TABLE(
  establishment_id uuid,
  establishment_nom text,
  nom_commerce text,
  logo_url text,
  couleur_marque text,
  acces_actif boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.id, e.nom, m.nom_commerce, m.logo_url, m.couleur_marque,
         (m.access_status = 'active' OR (m.access_status = 'trial' AND m.trial_ends_at > now()))
  FROM public.establishments e
  JOIN public.merchants m ON m.id = e.merchant_id
  WHERE e.public_code = _code
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.get_public_establishment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_establishment(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_customer_public(_code text, _nom text, _prenom text, _telephone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _est public.establishments%ROWTYPE;
  _m public.merchants%ROWTYPE;
  _existing uuid;
  _new uuid;
BEGIN
  SELECT * INTO _est FROM public.establishments WHERE public_code = _code;
  IF _est.id IS NULL THEN
    RAISE EXCEPTION 'Établissement introuvable';
  END IF;

  SELECT * INTO _m FROM public.merchants WHERE id = _est.merchant_id;
  IF NOT (_m.access_status = 'active' OR (_m.access_status = 'trial' AND _m.trial_ends_at > now())) THEN
    RAISE EXCEPTION 'Programme de fidélité momentanément indisponible';
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
$function$;

REVOKE ALL ON FUNCTION public.register_customer_public(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_customer_public(text, text, text, text) TO anon, authenticated;