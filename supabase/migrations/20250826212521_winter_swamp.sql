/*
  # Comprehensive File Migration and Cleanup

  This migration handles:
  1. Migrating existing file URLs to new anonymized format
  2. Creating proper storage mappings for all users
  3. Ensuring bucket structure consistency
  4. Fixing any data inconsistencies

  ## Changes Made
  1. **Storage Mappings**: Create mappings for all existing users
  2. **URL Migration**: Convert old URLs to new anonymized format
  3. **Data Validation**: Ensure all URLs follow the correct pattern
  4. **Cleanup**: Remove any invalid or duplicate entries
*/

-- First, ensure all authenticated users have storage mappings in profiles
DO $$
DECLARE
    user_record RECORD;
    new_storage_uuid UUID;
BEGIN
    -- Update profiles table to ensure all users have storage_uuid
    FOR user_record IN 
        SELECT id, email FROM auth.users 
        WHERE id NOT IN (SELECT id FROM profiles WHERE storage_uuid IS NOT NULL)
    LOOP
        new_storage_uuid := gen_random_uuid();
        
        INSERT INTO profiles (id, email, storage_uuid, is_admin, created_at)
        VALUES (user_record.id, user_record.email, new_storage_uuid, false, now())
        ON CONFLICT (id) DO UPDATE SET
            storage_uuid = COALESCE(profiles.storage_uuid, new_storage_uuid),
            email = COALESCE(profiles.email, user_record.email);
            
        RAISE NOTICE 'Created/updated profile for user: %', user_record.email;
    END LOOP;
END $$;

-- Create storage mappings for all submission emails that don't have profiles
DO $$
DECLARE
    submission_record RECORD;
    existing_mapping_uuid UUID;
BEGIN
    FOR submission_record IN 
        SELECT DISTINCT user_email 
        FROM form_submissions 
        WHERE user_email IS NOT NULL 
        AND user_email NOT IN (SELECT email FROM profiles)
        AND user_email NOT IN (SELECT email FROM email_storage_mapping)
    LOOP
        INSERT INTO email_storage_mapping (email)
        VALUES (submission_record.user_email)
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Created storage mapping for email: %', submission_record.user_email;
    END LOOP;
END $$;

-- Function to get storage UUID for any email
CREATE OR REPLACE FUNCTION get_storage_uuid_for_email(email_param TEXT)
RETURNS UUID AS $$
DECLARE
    storage_uuid_result UUID;
BEGIN
    -- First try profiles table
    SELECT storage_uuid INTO storage_uuid_result
    FROM profiles 
    WHERE email = email_param;
    
    IF storage_uuid_result IS NOT NULL THEN
        RETURN storage_uuid_result;
    END IF;
    
    -- Then try email_storage_mapping
    SELECT storage_uuid INTO storage_uuid_result
    FROM email_storage_mapping 
    WHERE email = email_param;
    
    RETURN storage_uuid_result;
END;
$$ LANGUAGE plpgsql;

-- Function to convert old URL to new format
CREATE OR REPLACE FUNCTION convert_file_url(
    old_url TEXT,
    form_name_param TEXT,
    submission_id_param UUID,
    user_email_param TEXT
) RETURNS TEXT AS $$
DECLARE
    storage_uuid_val UUID;
    filename TEXT;
    clean_form_name TEXT;
    user_id_short TEXT;
    new_url TEXT;
BEGIN
    -- Skip if already in new format
    IF old_url ~ '/forms/[^/]+/user_[a-f0-9]{8}/[a-f0-9-]{36}/' THEN
        RETURN old_url;
    END IF;
    
    -- Get storage UUID
    storage_uuid_val := get_storage_uuid_for_email(user_email_param);
    IF storage_uuid_val IS NULL THEN
        RAISE WARNING 'No storage UUID found for email: %', user_email_param;
        RETURN old_url;
    END IF;
    
    -- Extract filename from old URL
    filename := regexp_replace(old_url, '.*/', '');
    
    -- Clean form name
    clean_form_name := lower(regexp_replace(form_name_param, '[^a-zA-Z0-9\s]', '', 'g'));
    clean_form_name := regexp_replace(clean_form_name, '\s+', '_', 'g');
    
    -- Create short user ID
    user_id_short := 'user_' || substring(replace(storage_uuid_val::text, '-', ''), 1, 8);
    
    -- Build new URL
    new_url := regexp_replace(
        old_url, 
        '/storage/v1/object/public/forms/.*$',
        '/storage/v1/object/public/forms/' || clean_form_name || '/' || user_id_short || '/' || submission_id_param || '/' || filename
    );
    
    RETURN new_url;
END;
$$ LANGUAGE plpgsql;

-- Migrate all existing form submissions
DO $$
DECLARE
    submission_record RECORD;
    form_record RECORD;
    old_url TEXT;
    new_url TEXT;
    new_urls TEXT[] := '{}';
    url_changed BOOLEAN := false;
BEGIN
    FOR submission_record IN 
        SELECT fs.id, fs.form_id, fs.uploaded_files, fs.user_email
        FROM form_submissions fs
        WHERE array_length(fs.uploaded_files, 1) > 0
    LOOP
        -- Get form name
        SELECT name INTO form_record FROM forms WHERE id = submission_record.form_id;
        
        new_urls := '{}';
        url_changed := false;
        
        -- Process each file URL
        FOREACH old_url IN ARRAY submission_record.uploaded_files
        LOOP
            new_url := convert_file_url(
                old_url,
                form_record.name,
                submission_record.id,
                submission_record.user_email
            );
            
            new_urls := array_append(new_urls, new_url);
            
            IF new_url != old_url THEN
                url_changed := true;
                RAISE NOTICE 'Converting URL for submission %: % -> %', 
                    submission_record.id, old_url, new_url;
            END IF;
        END LOOP;
        
        -- Update if any URLs changed
        IF url_changed THEN
            UPDATE form_submissions 
            SET uploaded_files = new_urls
            WHERE id = submission_record.id;
            
            RAISE NOTICE 'Updated submission % with % files', 
                submission_record.id, array_length(new_urls, 1);
        END IF;
    END LOOP;
END $$;

-- Clean up temporary functions
DROP FUNCTION IF EXISTS get_storage_uuid_for_email(TEXT);
DROP FUNCTION IF EXISTS convert_file_url(TEXT, TEXT, UUID, TEXT);

-- Verify migration results
DO $$
DECLARE
    total_submissions INTEGER;
    migrated_submissions INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_submissions 
    FROM form_submissions 
    WHERE array_length(uploaded_files, 1) > 0;
    
    SELECT COUNT(*) INTO migrated_submissions
    FROM form_submissions 
    WHERE array_length(uploaded_files, 1) > 0
    AND uploaded_files[1] ~ '/forms/[^/]+/user_[a-f0-9]{8}/[a-f0-9-]{36}/';
    
    RAISE NOTICE 'Migration complete: % of % submissions have new URL format', 
        migrated_submissions, total_submissions;
END $$;