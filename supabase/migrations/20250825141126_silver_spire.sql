/*
  # Create bucket policies SQL function

  1. New Functions
    - `create_bucket_policies(bucket_name TEXT)` - Creates RLS policies for storage buckets
      - Creates INSERT policy for anonymous users to upload files
      - Creates SELECT policy for anonymous users to download files
      - Uses dynamic SQL with proper escaping for security

  2. Security
    - Function runs with SECURITY DEFINER to have elevated privileges
    - Uses format() with %L for proper SQL injection protection
    - Handles duplicate policy errors gracefully
*/

CREATE OR REPLACE FUNCTION create_bucket_policies(bucket_name TEXT)
RETURNS VOID 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Policy for anonymous users to insert (upload) files
    BEGIN
        EXECUTE format('
            CREATE POLICY %I ON storage.objects 
            FOR INSERT TO anon
            WITH CHECK (bucket_id = %L)
        ', 'Allow anon upload to ' || bucket_name, bucket_name);
    EXCEPTION 
        WHEN duplicate_object THEN 
            -- Policy already exists, ignore
            NULL;
    END;

    -- Policy for anonymous users to select (download) files  
    BEGIN
        EXECUTE format('
            CREATE POLICY %I ON storage.objects 
            FOR SELECT TO anon
            USING (bucket_id = %L)
        ', 'Allow anon download from ' || bucket_name, bucket_name);
    EXCEPTION 
        WHEN duplicate_object THEN 
            -- Policy already exists, ignore
            NULL;
    END;

    -- Policy for public users to select (download) files
    BEGIN
        EXECUTE format('
            CREATE POLICY %I ON storage.objects 
            FOR SELECT TO public
            USING (bucket_id = %L)
        ', 'Allow public download from ' || bucket_name, bucket_name);
    EXCEPTION 
        WHEN duplicate_object THEN 
            -- Policy already exists, ignore
            NULL;
    END;
END;
$$;