/*
  # Fix RLS policies for email_storage_mapping table

  This migration applies the same RLS pattern used by the form_submissions table
  to allow anonymous users to insert and read email storage mappings.

  1. Security
    - Enable RLS on email_storage_mapping table
    - Add policy for anonymous users to insert mappings
    - Add policy for anonymous users to read mappings
    - Add policy for authenticated admins to read all mappings
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous insert" ON email_storage_mapping;
DROP POLICY IF EXISTS "Allow anonymous select" ON email_storage_mapping;
DROP POLICY IF EXISTS "Allow admin select" ON email_storage_mapping;

-- Ensure RLS is enabled
ALTER TABLE email_storage_mapping ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert email mappings (same as form_submissions)
CREATE POLICY "anyone can insert email_storage_mapping"
  ON email_storage_mapping
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public read access to email mappings (same pattern as form_submissions)
CREATE POLICY "anyone can read email_storage_mapping"
  ON email_storage_mapping
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated admins to read all mappings
CREATE POLICY "admins can read all email_storage_mapping"
  ON email_storage_mapping
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );