/*
  # Fix foreign key constraint for storage UUID function

  1. Problem
    - The get_or_create_storage_uuid function tries to create profiles for emails
    - But these emails don't exist in auth.users table
    - This violates the foreign key constraint profiles_id_fkey

  2. Solution
    - Create a separate table for email-to-uuid mapping
    - Don't rely on auth.users for migration purposes
    - Keep existing profiles table intact for real users

  3. Changes
    - Create email_storage_mapping table
    - Update get_or_create_storage_uuid function
    - Handle migration without foreign key constraints
*/

-- Create a separate table for email to storage UUID mapping (migration purposes)
CREATE TABLE IF NOT EXISTS email_storage_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  storage_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_storage_mapping ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users (admins)
CREATE POLICY "Admins can read email storage mapping"
  ON email_storage_mapping
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Create or replace the function to use the new mapping table
CREATE OR REPLACE FUNCTION get_or_create_storage_uuid(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  storage_id uuid;
BEGIN
  -- Try to get existing storage UUID from mapping table
  SELECT storage_uuid INTO storage_id
  FROM email_storage_mapping
  WHERE email = user_email;
  
  -- If not found, create new mapping
  IF storage_id IS NULL THEN
    INSERT INTO email_storage_mapping (email, storage_uuid)
    VALUES (user_email, gen_random_uuid())
    ON CONFLICT (email) DO NOTHING
    RETURNING storage_uuid INTO storage_id;
    
    -- If still null due to race condition, get it
    IF storage_id IS NULL THEN
      SELECT storage_uuid INTO storage_id
      FROM email_storage_mapping
      WHERE email = user_email;
    END IF;
  END IF;
  
  RETURN storage_id;
END;
$$;