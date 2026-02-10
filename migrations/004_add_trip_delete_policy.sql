-- Add DELETE policy for trips table
-- Drivers can delete trips associated with their cars

CREATE POLICY "Drivers can delete trips for their cars" ON public.trips
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = trips.car_id
        AND cars.driver_id = auth.uid()
    )
  ); 