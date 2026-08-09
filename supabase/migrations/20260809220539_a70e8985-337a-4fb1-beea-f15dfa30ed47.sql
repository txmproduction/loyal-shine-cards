DROP FUNCTION IF EXISTS public.get_public_establishment(text);

CREATE OR REPLACE FUNCTION public.get_public_establishment(_code text)
RETURNS TABLE(
  establishment_id uuid,
  establishment_nom text,
  nom_commerce text,
  logo_url text,
  photo_url text,
  couleur_marque text,
  acces_actif boolean,
  mode_recompense text,
  seuil numeric,
  valeur_recompense text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id,
         e.nom,
         m.nom_commerce,
         m.logo_url,
         m.photo_url,
         m.couleur_marque,
         (m.access_status = 'active' OR (m.access_status = 'trial' AND m.trial_ends_at > now())),
         coalesce(lc.mode_recompense, 'passages'),
         CASE WHEN coalesce(lc.mode_recompense,'passages') = 'montant'
              THEN coalesce(lc.montant_pour_recompense, 100)
              ELSE coalesce(lc.nb_points_pour_recompense, 10)::numeric END,
         coalesce(lc.valeur_recompense, 'Récompense offerte')
  FROM public.establishments e
  JOIN public.merchants m ON m.id = e.merchant_id
  LEFT JOIN public.loyalty_cards lc ON lc.merchant_id = m.id
  WHERE e.public_code = _code
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_establishment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_establishment(text) TO anon, authenticated;