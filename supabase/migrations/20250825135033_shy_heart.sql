/*
  # Add storage upload policy for anonymous users

  1. Security
    - Allow anonymous users to upload files to 'user-uploads' bucket
    - Restrict uploads to only the 'user-uploads' bucket
    - Enable anonymous users to insert objects in storage

  2. Changes
    - Add RLS policy for INSERT operations on storage.objects table
    - Allow anon role to upload files to user-uploads bucket only
*/

-- Create policy to allow anonymous users to upload files to user-uploads bucket
CREATE POLICY "Allow anonymous uploads to user-uploads bucket"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'user-uploads');

-- Create policy to allow anonymous users to view files in user-uploads bucket (needed for public URLs)
CREATE POLICY "Allow anonymous access to user-uploads bucket"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'user-uploads');