-- Migration: Add missing columns to active_trips and trip_locations
-- Run this in your Supabase SQL Editor if you previously created the tables without these columns

ALTER TABLE public.active_trips
ADD COLUMN IF NOT EXISTS current_latitude numeric,
ADD COLUMN IF NOT EXISTS current_longitude numeric,
ADD COLUMN IF NOT EXISTS current_speed numeric default 0,
ADD COLUMN IF NOT EXISTS current_heading numeric default 0,
ADD COLUMN IF NOT EXISTS last_location_update timestamptz;

ALTER TABLE public.trip_locations
ADD COLUMN IF NOT EXISTS accuracy numeric,
ADD COLUMN IF NOT EXISTS speed numeric,
ADD COLUMN IF NOT EXISTS heading numeric;

-- Reload the PostgREST schema cache to immediately recognize the new columns
NOTIFY pgrst, 'reload schema';
