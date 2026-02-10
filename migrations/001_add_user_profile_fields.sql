-- Migration script to add new columns to users table
-- Run this if you already have the users table created

-- Add new columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add emergency_contact_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'emergency_contact_name') THEN
        ALTER TABLE public.users ADD COLUMN emergency_contact_name text;
    END IF;

    -- Add emergency_contact_phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'emergency_contact_phone') THEN
        ALTER TABLE public.users ADD COLUMN emergency_contact_phone text;
    END IF;

    -- Add home_address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'home_address') THEN
        ALTER TABLE public.users ADD COLUMN home_address text;
    END IF;

    -- Add is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active boolean DEFAULT true;
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Make phone unique if not already
-- Note: This will fail if there are duplicate phone numbers
-- You may need to handle duplicates first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_phone_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add unique constraint on phone - there may be duplicates';
END $$;

-- Create storage bucket for profile pictures (run in Supabase Dashboard)
-- Note: This must be done via Supabase Dashboard or Storage API
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named "profile-pictures"
-- 3. Set it as public
-- 4. Add the following policies:

-- Policy for authenticated users to upload their own profile picture
-- CREATE POLICY "Users can upload their own profile picture"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'profile-pictures' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy for authenticated users to update their own profile picture
-- CREATE POLICY "Users can update their own profile picture"
-- ON storage.objects FOR UPDATE
-- USING (
--   bucket_id = 'profile-pictures' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy for authenticated users to delete their own profile picture
-- CREATE POLICY "Users can delete their own profile picture"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'profile-pictures' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy for public read access to profile pictures
-- CREATE POLICY "Profile pictures are publicly accessible"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'profile-pictures');

-- Update the trigger function to handle new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    role,
    phone,
    is_active,
    created_at
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    CASE 
      WHEN new.email = 'imstorm23203@gmail.com' THEN 'driver'
      ELSE COALESCE(new.raw_user_meta_data->>'role', 'passenger')
    END,
    new.raw_user_meta_data->>'phone',
    true,
    NOW()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
