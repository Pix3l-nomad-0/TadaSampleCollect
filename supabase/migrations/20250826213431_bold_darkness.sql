/*
  # Reset RLS policies for email_storage_mapping table

  1. Security Changes
    - Drop all existing policies on email_storage_mapping table
    - Create new policies that exactly match the working form_submissions pattern
    - Allow anonymous users to insert new email mappings
    - Allow public read access to mappings
    - Allow admin users full access

  2. Policy Details
    - INSERT policy for anonymous users (anon role)
    - SELECT policy for public access (public role)  
    - Admin policy for authenticated admin users
*/

-- Drop all existing policies on email_storage_mapping
DROP POLICY IF EXISTS "admins can read all email_storage_mapping" ON email_storage_mapping;
DROP POLICY IF EXISTS "anyone can insert email_storage_mapping" ON email_storage_mapping;
DROP POLICY IF EXISTS "anyone can read email_storage_mapping" ON email_storage_mapping;
DROP POLICY IF EXISTS "Allow anon insert for email_storage_mapping" ON email_storage_mapping;
DROP POLICY IF EXISTS "Allow public read for email_storage_mapping" ON email_storage_mapping;
DROP POLICY IF EXISTS "Allow admin access for email_storage_mapping" ON email_storage_mapping;

-- Create new policies that exactly match the form_submissions pattern
CREATE POLICY "anyone can insert email_storage_mapping"
  ON email_storage_mapping
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anyone can read email_storage_mapping"
  ON email_storage_mapping
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "admins can read all email_storage_mapping"
  ON email_storage_mapping
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));