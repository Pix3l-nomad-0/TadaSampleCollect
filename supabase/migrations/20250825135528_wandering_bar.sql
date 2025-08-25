/*
  # Add RLS policies for dynamic form-specific storage buckets

  1. Security
    - Enable RLS on storage.objects table
    - Allow anonymous users to INSERT files into any bucket starting with 'form-'
    - Allow anonymous users to SELECT files from any bucket starting with 'form-'
    - This supports the new form-specific bucket naming scheme
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous uploads to form buckets" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous access to form buckets" ON storage.objects;

-- Allow anonymous users to upload files to form-specific buckets
CREATE POLICY "Allow anonymous uploads to form buckets"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id LIKE 'form-%');

-- Allow anonymous users to access files from form-specific buckets
CREATE POLICY "Allow anonymous access to form buckets"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id LIKE 'form-%');