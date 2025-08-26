/*
  # Allow anonymous users to insert into email_storage_mapping

  This migration creates the exact policy needed to allow anonymous users
  to create storage mappings for public form submissions.

  1. Security
    - Drops any conflicting policies
    - Creates policy to allow INSERT for anon role
    - Uses WITH CHECK (true) to allow any anonymous insertion
*/

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Allow anon insert for email_storage_mapping" ON public.email_storage_mapping;
DROP POLICY IF EXISTS "anyone can insert email_storage_mapping" ON public.email_storage_mapping;
DROP POLICY IF EXISTS "anon can insert email_storage_mapping" ON public.email_storage_mapping;

-- Create the exact policy suggested by the expert
CREATE POLICY "Allow anon insert for email_storage_mapping" 
ON public.email_storage_mapping 
FOR INSERT 
TO anon
WITH CHECK (true);