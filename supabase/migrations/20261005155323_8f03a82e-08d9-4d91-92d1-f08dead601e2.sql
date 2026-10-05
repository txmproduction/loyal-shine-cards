-- Scan comptoir : activation par établissement
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS scan_client_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.scan_client_public(_code text, _nom text, _prenom text, _telephone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _est public.establishments%ROWTYPE;
  _m public.merchants%ROWTYPE;
  _lc public.loyalty_cards%ROWTYPE;
  _cid uuid;
  _already boolean;
  _total numeric;
BEGIN
  SELECT * INTO _est FROM public.establishments WHERE public_code = _code;
  IF _est.id IS NULL THEN
    RAISE EXCEPTION 'Établissement introuvable';
  END IF;

  IF NOT _est.scan_client_enabled THEN
    RAISE EXCEPTION 'Scan comptoir désactivé pour cet établissement';
  END IF;

  SELECT * INTO _m FROM public.merchants WHERE id = _est.merchant_id;
  IF NOT (_m.access_status = 'active' OR (_m.access_status = 'trial' AND _m.trial_ends_at > now())) THEN
    RAISE EXCEPTION 'Programme de fidélité momentanément indisponible';
  END IF;

  IF coalesce(trim(_nom), '') = '' OR coalesce(trim(_telephone), '') = '' THEN
    RAISE EXCEPTION 'Nom et téléphone requis';
  END IF;

  SELECT id INTO _cid FROM public.customers
   WHERE merchant_id = _est.merchant_id
     AND regexp_replace(coalesce(telephone, ''), '[^0-9]', '', 'g') = regexp_replace(trim(_telephone), '[^0-9]', '', 'g')
   LIMIT 1;

  IF _cid IS NULL THEN
    INSERT INTO public.customers (merchant_id, establishment_id, nom, prenom, telephone)
    VALUES (_est.merchant_id, _est.id, trim(_nom), nullif(trim(_prenom), ''), trim(_telephone))
    RETURNING id INTO _cid;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.points_history
    WHERE customer_id = _cid
      AND type = 'passage'
      AND points_ajoutes > 0
      AND date > now() - interval '24 hours'
  ) INTO _already;

  IF NOT _already THEN
    INSERT INTO public.points_history (customer_id, establishment_id, points_ajoutes, montant, type)
    VALUES (_cid, _est.id, 1, 0, 'passage');
  END IF;

  SELECT * INTO _lc FROM public.loyalty_cards WHERE merchant_id = _est.merchant_id LIMIT 1;

  IF coalesce(_lc.mode_recompense, 'passages') = 'montant' THEN
    SELECT coalesce(sum(montant), 0) INTO _total FROM public.points_history WHERE customer_id = _cid;
  ELSE
    SELECT coalesce(sum(points_ajoutes), 0) INTO _total FROM public.points_history WHERE customer_id = _cid;
  END IF;

  RETURN json_build_object(
    'customer_id', _cid,
    'nom', trim(_nom),
    'prenom', nullif(trim(_prenom), ''),
    'already', _already,
    'mode', coalesce(_lc.mode_recompense, 'passages'),
    'total', _total,
    'seuil', CASE WHEN coalesce(_lc.mode_recompense, 'passages') = 'montant'
                  THEN coalesce(_lc.montant_pour_recompense, 100)
                  ELSE coalesce(_lc.nb_points_pour_recompense, 10) END,
    'valeur', coalesce(_lc.valeur_recompense, 'Récompense offerte')
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.scan_client_public(text, text, text, text) TO anon, authenticated, service_role, postgres;

-- Réactive l'essai du commerce de test « App store » pour permettre les essais
UPDATE public.merchants
SET trial_ends_at = now() + interval '30 days', access_status = 'trial'
WHERE email = 'soriderofficiel@gmail.com';