ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS secteur text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS partage_mode text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

UPDATE public.merchants SET onboarding_completed = true WHERE created_at < now();

DROP FUNCTION IF EXISTS public.get_public_establishment(text);

CREATE OR REPLACE FUNCTION public.get_public_establishment(_code text)
RETURNS TABLE(
  establishment_id uuid,
  establishment_nom text,
  nom_commerce text,
  logo_url text,
  photo_url text,
  couleur_marque text,
  acces_actif boolean
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
         (m.access_status = 'active' OR (m.access_status = 'trial' AND m.trial_ends_at > now()))
  FROM public.establishments e
  JOIN public.merchants m ON m.id = e.merchant_id
  WHERE e.public_code = _code
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_establishment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_establishment(text) TO anon, authenticated;