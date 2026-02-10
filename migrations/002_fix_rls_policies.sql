-- =====================================================
-- FIX RLS POLICIES - Resolve Infinite Recursion (42P17)
-- =====================================================
-- Run this script in your Supabase SQL Editor to fix 
-- the infinite recursion error in trips and cars policies
-- =====================================================

-- Step 1: Drop existing problematic policies on trips
DROP POLICY IF EXISTS "Passengers can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Drivers can view trips for their cars" ON public.trips;
DROP POLICY IF EXISTS "Passengers can insert their own trips (via scan)" ON public.trips;
DROP POLICY IF EXISTS "Drivers can update payment status" ON public.trips;

-- Step 2: Drop existing policies on cars
DROP POLICY IF EXISTS "Cars viewable by everyone" ON public.cars;
DROP POLICY IF EXISTS "Drivers can insert their own cars" ON public.cars;
DROP POLICY IF EXISTS "Drivers can update their own cars" ON public.cars;

-- Step 3: Recreate cars policies (simpler, no recursion)
CREATE POLICY "Anyone can view cars" ON public.cars
  FOR SELECT USING (true);

CREATE POLICY "Drivers can insert their cars" ON public.cars
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their cars" ON public.cars
  FOR UPDATE USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete their cars" ON public.cars
  FOR DELETE USING (auth.uid() = driver_id);

-- Step 4: Recreate trips policies using SECURITY DEFINER function
-- This avoids the recursive RLS check by using a function

-- Create a helper function to check if user is the driver of a car
CREATE OR REPLACE FUNCTION public.is_driver_of_car(car_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cars
    WHERE id = car_uuid
    AND driver_id = auth.uid()
  );
$$;

-- Create trips policies using the helper function
CREATE POLICY "Passengers can view own trips" ON public.trips
  FOR SELECT USING (auth.uid() = passenger_id);

CREATE POLICY "Drivers can view their car trips" ON public.trips
  FOR SELECT USING (public.is_driver_of_car(car_id));

CREATE POLICY "Passengers can insert trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Drivers can update trip payment" ON public.trips
  FOR UPDATE USING (public.is_driver_of_car(car_id));

-- =====================================================
-- VERIFICATION: Run these to check policies are set up
-- =====================================================
-- SELECT * FROM pg_policies WHERE tablename = 'trips';
-- SELECT * FROM pg_policies WHERE tablename = 'cars';
-- SELECT * FROM pg_policies WHERE tablename = 'users';
