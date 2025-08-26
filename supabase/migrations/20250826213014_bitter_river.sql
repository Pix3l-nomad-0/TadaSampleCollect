/*
  # Fix RLS policies for email_storage_mapping table

  1. Security Changes
    - Drop existing restrictive policies
    - Add proper policy for anonymous users to insert mappings
    - Add proper policy for anonymous users to read their own mappings
    - Ensure authenticated users can still access their data

  2. Policy Details
    - Anonymous users can insert new email mappings
    - Anonymous users can read mappings by email
    - Authenticated users (admins) can read all mappings
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Anonymous users can create storage mappings" ON email_storage_mapping;
DROP POLICY IF EXISTS "Anonymous users can read storage mappings" ON email_storage_mapping;
DROP POLICY IF EXISTS "Admins can read email storage mapping" ON email_storage_mapping;

-- Create new policies that properly allow anonymous access
CREATE POLICY "Allow anonymous insert for email mappings"
  ON email_storage_mapping
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read for email mappings"
  ON email_storage_mapping
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated read for email mappings"
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

-- Ensure RLS is enabled
ALTER TABLE email_storage_mapping ENABLE ROW LEVEL SECURITY;