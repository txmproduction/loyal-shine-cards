ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS geo_relance_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS geo_relance_rayon_m integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS geo_relance_message text;

ALTER TABLE public.merchants
  ADD CONSTRAINT merchants_geo_relance_rayon_m_check
  CHECK (geo_relance_rayon_m >= 500 AND geo_relance_rayon_m <= 5000);