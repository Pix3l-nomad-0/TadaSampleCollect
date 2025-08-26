/*
  # Fix storage UUID function

  1. Updates
    - Fix the get_or_create_storage_uuid function to work with existing table structure
    - Use proper ON CONFLICT with the primary key (id)
    - Handle cases where users don't exist in auth.users
    - Create profiles for submission emails even if they're not registered users

  2. Security
    - Function is SECURITY DEFINER to access auth.users
    - Proper error handling for missing users
*/

-- First, let's make sure the profiles table has the right structure
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS storage_uuid uuid DEFAULT gen_random_uuid();

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.get_or_create_storage_uuid(text);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.get_or_create_storage_uuid(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _user_id uuid;
    _storage_uuid uuid;
BEGIN
    -- First try to get existing profile by email
    SELECT storage_uuid INTO _storage_uuid 
    FROM public.profiles 
    WHERE email = user_email;
    
    IF _storage_uuid IS NOT NULL THEN
        RETURN _storage_uuid;
    END IF;
    
    -- Try to get the user ID from auth.users
    SELECT id INTO _user_id FROM auth.users WHERE email = user_email;
    
    -- If user exists in auth.users, use their ID
    IF _user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, storage_uuid)
        VALUES (_user_id, user_email, gen_random_uuid())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            storage_uuid = COALESCE(profiles.storage_uuid, EXCLUDED.storage_uuid)
        RETURNING storage_uuid INTO _storage_uuid;
    ELSE
        -- User doesn't exist in auth.users, create profile with generated ID
        INSERT INTO public.profiles (id, email, storage_uuid)
        VALUES (gen_random_uuid(), user_email, gen_random_uuid())
        RETURNING storage_uuid INTO _storage_uuid;
    END IF;
    
    RETURN _storage_uuid;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_storage_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_storage_uuid(text) TO anon;