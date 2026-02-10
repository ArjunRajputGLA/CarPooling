-- Add fare_settings table for configurable fare management
-- This table stores the fare configuration per car or as a global default

CREATE TABLE IF NOT EXISTS public.fare_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  car_id uuid REFERENCES public.cars(id),
  daily_fare decimal NOT NULL DEFAULT 31,
  is_active boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLS for fare_settings
ALTER TABLE public.fare_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fare settings viewable by everyone" ON public.fare_settings
  FOR SELECT USING (true);

CREATE POLICY "Drivers can manage fare settings for their cars" ON public.fare_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = fare_settings.car_id
      AND cars.driver_id = auth.uid()
    )
  );

-- Create payment history view for weekly settlements
CREATE OR REPLACE VIEW public.weekly_payment_summary AS
SELECT 
  t.passenger_id,
  u.full_name as passenger_name,
  u.phone as passenger_phone,
  t.car_id,
  c.car_name,
  c.driver_id,
  DATE_TRUNC('week', t.scan_timestamp::date) as week_start,
  COUNT(*) as trip_count,
  SUM(t.fare_amount) as total_fare,
  SUM(CASE WHEN t.payment_status = 'paid' THEN t.fare_amount ELSE 0 END) as paid_amount,
  SUM(CASE WHEN t.payment_status = 'pending' THEN t.fare_amount ELSE 0 END) as pending_amount
FROM public.trips t
JOIN public.users u ON u.id = t.passenger_id
JOIN public.cars c ON c.id = t.car_id
GROUP BY t.passenger_id, u.full_name, u.phone, t.car_id, c.car_name, c.driver_id, DATE_TRUNC('week', t.scan_timestamp::date);

-- Add index on scan_timestamp for faster date range queries
CREATE INDEX IF NOT EXISTS idx_trips_scan_timestamp ON public.trips(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_trips_passenger_id ON public.trips(passenger_id);
CREATE INDEX IF NOT EXISTS idx_trips_car_id ON public.trips(car_id);
CREATE INDEX IF NOT EXISTS idx_trips_payment_status ON public.trips(payment_status);

-- Insert default fare setting (no car_id = global default)
INSERT INTO public.fare_settings (daily_fare, is_active)
VALUES (31, true)
ON CONFLICT DO NOTHING;
