-- Add slot_interval_minutes to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS slot_interval_minutes integer NOT NULL DEFAULT 30;
