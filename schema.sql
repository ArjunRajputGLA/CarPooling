-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Users table (Public profiles for Auth users)
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  phone text unique,
  role text check (role in ('driver', 'passenger')),
  profile_picture_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  home_address text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Turn on RLS
alter table public.users enable row level security;

-- Policies for Users
create policy "Public profiles are viewable by everyone." on public.users
  for select using (true);

create policy "Users can insert their own profile." on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.users
  for update using (auth.uid() = id);

-- Create Cars table (Drivers only)
create table public.cars (
  id uuid default uuid_generate_v4() primary key,
  driver_id uuid references public.users(id) not null,
  car_name text,
  license_plate text,
  qr_code_data text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.cars enable row level security;

create policy "Cars viewable by everyone" on public.cars
  for select using (true);

create policy "Drivers can insert their own cars" on public.cars
  for insert with check (auth.uid() = driver_id);

create policy "Drivers can update their own cars" on public.cars
  for update using (auth.uid() = driver_id);

-- Create Trips table
create table public.trips (
  id uuid default uuid_generate_v4() primary key,
  car_id uuid references public.cars(id) not null,
  passenger_id uuid references public.users(id) not null,
  scan_timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  fare_amount decimal not null,
  payment_status text check (payment_status in ('pending', 'paid')) default 'pending',
  payment_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.trips enable row level security;

create policy "Passengers can view their own trips" on public.trips
  for select using (auth.uid() = passenger_id);

create policy "Drivers can view trips for their cars" on public.trips
  for select using (
    exists (
      select 1 from public.cars
      where cars.id = trips.car_id
      and cars.driver_id = auth.uid()
    )
  );

create policy "Passengers can insert their own trips (via scan)" on public.trips
  for insert with check (auth.uid() = passenger_id);

create policy "Drivers can update payment status" on public.trips
  for update using (
    exists (
      select 1 from public.cars
      where cars.id = trips.car_id
        and cars.driver_id = auth.uid()
    )
  );

create policy "Drivers can delete trips for their cars" on public.trips
  for delete using (
    exists (
      select 1 from public.cars
      where cars.id = trips.car_id
        and cars.driver_id = auth.uid()
    )
  );

-- Function to handle new user creation trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
