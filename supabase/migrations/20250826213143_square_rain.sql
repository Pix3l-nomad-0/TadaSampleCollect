/*
  # Disable RLS on email_storage_mapping table

  1. Changes
    - Disable Row Level Security on email_storage_mapping table
    - Drop all existing policies
    - Allow anonymous users to insert and select from this table

  This table only contains email-to-UUID mappings for anonymization purposes
  and doesn't contain sensitive data that requires RLS protection.
*/

-- Drop all existing policies on email_storage_mapping
DROP POLICY IF EXISTS "Allow anonymous insert for email mappings" ON email_storage_mapping;
DROP POLICY IF EXISTS "Allow anonymous read for email mappings" ON email_storage_mapping;
DROP POLICY IF EXISTS "Allow authenticated read for email mappings" ON email_storage_mapping;
DROP POLICY IF EXISTS "Anonymous users can insert email mappings" ON email_storage_mapping;
DROP POLICY IF EXISTS "Anonymous users can read email mappings" ON email_storage_mapping;
DROP POLICY IF EXISTS "Admin users can read all email mappings" ON email_storage_mapping;

-- Disable RLS on email_storage_mapping table
ALTER TABLE email_storage_mapping DISABLE ROW LEVEL SECURITY;