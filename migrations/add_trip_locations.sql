-- Migration: Add trip location tracking tables
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. active_trips — tracks currently live trips
-- ============================================
create table if not exists public.active_trips (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id),
  driver_id uuid references public.users(id) not null,
  passenger_id uuid references public.users(id),
  status text check (status in ('active', 'completed')) default 'active',
  current_latitude numeric,
  current_longitude numeric,
  current_speed numeric default 0,
  current_heading numeric default 0,
  last_location_update timestamptz,
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);

alter table public.active_trips enable row level security;

-- Drivers can see their own active trips
create policy "Drivers can view their own active trips" on public.active_trips
  for select using (auth.uid() = driver_id);

-- Passengers can view active trips where they are the passenger
create policy "Passengers can view their active trips" on public.active_trips
  for select using (auth.uid() = passenger_id);

-- Drivers can insert their own active trips
create policy "Drivers can create active trips" on public.active_trips
  for insert with check (auth.uid() = driver_id);

-- Drivers can update their own active trips (location, status)
create policy "Drivers can update their active trips" on public.active_trips
  for update using (auth.uid() = driver_id);

-- ============================================
-- 2. trip_locations — GPS breadcrumb trail
-- ============================================
create table if not exists public.trip_locations (
  id uuid default uuid_generate_v4() primary key,
  active_trip_id uuid references public.active_trips(id) on delete cascade,
  driver_id uuid references public.users(id) not null,
  latitude numeric not null,
  longitude numeric not null,
  accuracy numeric,
  speed numeric,
  heading numeric,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.trip_locations enable row level security;

-- Drivers can insert their own location data
create policy "Drivers can insert their locations" on public.trip_locations
  for insert with check (auth.uid() = driver_id);

-- Drivers can view their own location history
create policy "Drivers can view their locations" on public.trip_locations
  for select using (auth.uid() = driver_id);

-- Passengers can view locations for trips they are part of
create policy "Passengers can view trip locations" on public.trip_locations
  for select using (
    exists (
      select 1 from public.active_trips
      where active_trips.id = trip_locations.active_trip_id
        and active_trips.passenger_id = auth.uid()
    )
  );

-- ============================================
-- 3. Enable Realtime for active_trips
-- ============================================
-- This allows passengers to subscribe to driver location changes in real-time
alter publication supabase_realtime add table public.active_trips;

-- ============================================
-- 4. Index for faster queries
-- ============================================
create index if not exists idx_active_trips_driver_status
  on public.active_trips(driver_id, status);

create index if not exists idx_active_trips_passenger_status
  on public.active_trips(passenger_id, status);

create index if not exists idx_trip_locations_active_trip
  on public.trip_locations(active_trip_id, timestamp desc);
