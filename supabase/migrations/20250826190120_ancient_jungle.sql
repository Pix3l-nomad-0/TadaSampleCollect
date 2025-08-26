/*
  # Create missing profiles function

  1. New Functions
    - `create_missing_profiles()` - Creates profile entries for users who exist in auth.users but not in profiles table
    
  2. Security
    - Function runs with SECURITY DEFINER (elevated privileges)
    - Grant execute permission to authenticated users
    
  3. Functionality
    - Finds users in auth.users without corresponding profiles
    - Creates profiles with generated storage_uuid
    - Returns list of created email addresses
*/

CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record record;
    created_emails text[] := '{}';
BEGIN
    FOR user_record IN
        SELECT
            au.id,
            au.email
        FROM
            auth.users AS au
        LEFT JOIN
            public.profiles AS p ON au.id = p.id
        WHERE
            p.id IS NULL
    LOOP
        INSERT INTO public.profiles (id, email, storage_uuid, is_admin)
        VALUES (user_record.id, user_record.email, gen_random_uuid(), FALSE)
        ON CONFLICT (id) DO NOTHING;
        
        IF FOUND THEN
            created_emails := array_append(created_emails, user_record.email);
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT unnest(created_emails);
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_missing_profiles() TO authenticated;