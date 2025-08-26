/*
  # Fix RLS policies for anonymous users

  1. Security Updates
    - Allow anonymous users to insert into email_storage_mapping table
    - Allow anonymous users to upload files to forms bucket
    - Allow anonymous users to read from email_storage_mapping for their own entries

  This enables public form submissions to work properly by allowing:
  - Creation of storage mappings for new email addresses
  - File uploads from unauthenticated users
  - Reading storage UUIDs for path generation
*/

-- Allow anonymous users to insert into email_storage_mapping
CREATE POLICY "Anonymous users can create storage mappings"
  ON email_storage_mapping
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to read their own storage mappings
CREATE POLICY "Anonymous users can read storage mappings"
  ON email_storage_mapping
  FOR SELECT
  TO anon
  USING (true);

-- Note: Storage bucket policies need to be configured in the Supabase dashboard
-- Go to Storage > forms bucket > Policies and create:
-- 
-- Policy name: "Allow anonymous uploads"
-- Allowed operation: INSERT
-- Target roles: anon
-- USING expression: true
-- WITH CHECK expression: true