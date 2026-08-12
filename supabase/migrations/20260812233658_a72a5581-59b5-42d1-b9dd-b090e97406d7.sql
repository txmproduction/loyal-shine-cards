ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS message_promo text,
  ADD COLUMN IF NOT EXISTS message_promo_date timestamptz;