CREATE OR REPLACE FUNCTION public.scan_client_public(_code text, _nom text, _prenom text, _telephone text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _est establishments%ROWTYPE;
  _mer merchants%ROWTYPE;
  _card loyalty_cards%ROWTYPE;
  _cust customers%ROWTYPE;
  _phone text;
  _total numeric;
  _already boolean;
BEGIN
  SELECT * INTO _est FROM establishments WHERE public_code = _code;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF NOT _est.scan_client_enabled THEN RETURN json_build_object('error', 'disabled'); END IF;

  SELECT * INTO _mer FROM merchants WHERE id = _est.merchant_id;
  IF _mer.access_status <> 'active'
     AND NOT (_mer.access_status = 'trial' AND _mer.trial_ends_at > now()) THEN
    RETURN json_build_object('error', 'inactive');
  END IF;

  _phone := regexp_replace(coalesce(_telephone, ''), '[^0-9]', '', 'g');
  IF length(_phone) < 8 THEN RETURN json_build_object('error', 'invalid'); END IF;
  -- Compare on the last 9 digits so 06..., +33 6..., 0033 6... and spaced formats all match
  _phone := right(_phone, 9);

  SELECT * INTO _cust FROM customers
  WHERE merchant_id = _est.merchant_id
    AND right(regexp_replace(coalesce(telephone, ''), '[^0-9]', '', 'g'), 9) = _phone
  ORDER BY created_at ASC
  LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('error', 'unknown_phone'); END IF;

  SELECT * INTO _card FROM loyalty_cards WHERE merchant_id = _est.merchant_id LIMIT 1;

  _already := EXISTS (
    SELECT 1 FROM points_history
    WHERE customer_id = _cust.id AND points_ajoutes > 0 AND date > now() - interval '24 hours'
  );

  IF NOT _already THEN
    INSERT INTO points_history (customer_id, establishment_id, points_ajoutes, montant, type)
    VALUES (_cust.id, _est.id, 1, 0, 'passage');
  END IF;

  IF coalesce(_card.mode_recompense, 'passages') = 'montant' THEN
    SELECT coalesce(sum(montant), 0) INTO _total FROM points_history WHERE customer_id = _cust.id;
  ELSE
    SELECT coalesce(sum(points_ajoutes), 0) INTO _total FROM points_history WHERE customer_id = _cust.id;
  END IF;

  RETURN json_build_object(
    'customer_id', _cust.id,
    'nom', _cust.nom,
    'prenom', _cust.prenom,
    'already', _already,
    'mode', coalesce(_card.mode_recompense, 'passages'),
    'total', _total,
    'seuil', CASE WHEN coalesce(_card.mode_recompense, 'passages') = 'montant'
                  THEN coalesce(_card.montant_pour_recompense, 100)
                  ELSE coalesce(_card.nb_points_pour_recompense, 10) END,
    'valeur', coalesce(_card.valeur_recompense, 'Récompense offerte')
  );
END;
$function$;