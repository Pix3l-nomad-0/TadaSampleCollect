/*
  # Fix create_bucket_policies function for proper RLS

  1. Function Updates
    - Replace the existing create_bucket_policies function
    - Use proper bucket_id matching instead of bucket name patterns
    - Enable RLS on storage.objects table
    - Create policies for both INSERT and SELECT operations
    - Handle policy conflicts by dropping existing policies first

  2. Security
    - Allow anonymous users to upload files to specific buckets
    - Allow public read access to uploaded files
    - Use proper SQL escaping with %L format specifier
*/

CREATE OR REPLACE FUNCTION create_bucket_policies(bucket_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enable RLS on the storage.objects table if not already enabled
  BEGIN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;';
  EXCEPTION
    WHEN OTHERS THEN
      -- RLS might already be enabled, continue
      NULL;
  END;

  -- Drop existing policies if they exist to avoid conflicts on re-creation
  BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous uploads for %s" ON storage.objects;', bucket_name);
  EXCEPTION
    WHEN OTHERS THEN
      -- Policy might not exist, continue
      NULL;
  END;

  BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read access for %s" ON storage.objects;', bucket_name);
  EXCEPTION
    WHEN OTHERS THEN
      -- Policy might not exist, continue
      NULL;
  END;

  -- Create a policy to allow anonymous users to insert files into the specified bucket
  EXECUTE format('
    CREATE POLICY "Allow anonymous uploads for %s"
    ON storage.objects FOR INSERT TO anon
    WITH CHECK (bucket_id = %L);
  ', bucket_name, bucket_name);

  -- Create a policy to allow public read access to uploaded files
  EXECUTE format('
    CREATE POLICY "Allow public read access for %s"
    ON storage.objects FOR SELECT TO anon, public
    USING (bucket_id = %L);
  ', bucket_name, bucket_name);

END;
$$;