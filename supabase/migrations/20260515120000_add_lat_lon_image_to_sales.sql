-- Add latitude, longitude, and image_url to sales_records (sales dashboard only)
ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS latitude   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS image_url  TEXT;
