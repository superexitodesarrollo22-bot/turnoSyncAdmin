-- Add push_notifications_enabled to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT true;
