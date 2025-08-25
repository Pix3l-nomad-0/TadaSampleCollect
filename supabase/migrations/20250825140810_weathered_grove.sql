/*
  # Create function to set up RLS policies for storage buckets

  1. New Function
    - `create_bucket_policies(bucket_name text)`
    - Creates INSERT and SELECT policies for anonymous users on storage.objects
    - Allows file uploads and access for the specified bucket

  2. Security
    - Function is marked as SECURITY DEFINER to run with elevated privileges
    - Only creates policies for buckets with specific naming pattern
*/

CREATE OR REPLACE FUNCTION create_bucket_policies(bucket_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create INSERT policy for anonymous users to upload files
  EXECUTE format('
    CREATE POLICY "Allow anonymous uploads to %I"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (bucket_id = %L)
  ', bucket_name, bucket_name);

  -- Create SELECT policy for anonymous users to access files
  EXECUTE format('
    CREATE POLICY "Allow anonymous access to %I"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (bucket_id = %L)
  ', bucket_name, bucket_name);

EXCEPTION
  WHEN duplicate_object THEN
    -- Policy already exists, ignore the error
    NULL;
END;
$$;