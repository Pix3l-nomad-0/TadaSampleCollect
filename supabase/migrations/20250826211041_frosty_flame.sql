/*
  # Update old submission URLs to new format

  This migration updates existing form submissions that have old UUID-based URLs 
  to the new form-name-based URL format.

  1. Changes
     - Updates uploaded_files URLs from uuid_xxxxx format to form-name format
     - Converts: forms/uuid_fef060b2/uuid_fef060b2/submission_id/file.jpg
     - To: forms/form_name/user_fef060b2/submission_id/file.jpg

  2. Security
     - Uses existing RLS policies
     - No changes to permissions
*/

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS create_missing_profiles();

-- Create temporary function to update URLs
CREATE OR REPLACE FUNCTION update_submission_urls()
RETURNS void AS $$
DECLARE
    submission_record RECORD;
    form_record RECORD;
    old_url TEXT;
    new_url TEXT;
    updated_files TEXT[];
    url_parts TEXT[];
    user_part TEXT;
    path_after_user TEXT;
BEGIN
    -- Loop through all submissions with old-format URLs
    FOR submission_record IN 
        SELECT id, form_id, uploaded_files 
        FROM form_submissions 
        WHERE uploaded_files::text LIKE '%uuid_%'
    LOOP
        -- Get the form name for this submission
        SELECT name INTO form_record FROM forms WHERE id = submission_record.form_id;
        
        IF form_record.name IS NOT NULL THEN
            updated_files := ARRAY[]::TEXT[];
            
            -- Process each URL in the uploaded_files array
            FOREACH old_url IN ARRAY submission_record.uploaded_files
            LOOP
                -- Check if this URL has the old format
                IF old_url LIKE '%/forms/uuid_%' THEN
                    -- Extract parts: split by '/' and rebuild with form name
                    url_parts := string_to_array(old_url, '/');
                    
                    -- Find the uuid_ part and extract user identifier
                    FOR i IN 1..array_length(url_parts, 1) LOOP
                        IF url_parts[i] LIKE 'uuid_%' THEN
                            user_part := 'user_' || substring(url_parts[i] from 6); -- Remove 'uuid_' prefix
                            -- Get everything after the second uuid_ occurrence
                            path_after_user := array_to_string(url_parts[i+2:], '/');
                            EXIT;
                        END IF;
                    END LOOP;
                    
                    -- Construct new URL with form name
                    new_url := replace(old_url, '/forms/uuid_' || substring(user_part from 6) || '/uuid_' || substring(user_part from 6) || '/', 
                                     '/forms/' || form_record.name || '/' || user_part || '/');
                    
                    updated_files := array_append(updated_files, new_url);
                ELSE
                    -- Keep the URL as-is if it doesn't match old format
                    updated_files := array_append(updated_files, old_url);
                END IF;
            END LOOP;
            
            -- Update the submission with new URLs
            UPDATE form_submissions 
            SET uploaded_files = updated_files 
            WHERE id = submission_record.id;
            
            RAISE NOTICE 'Updated submission % with % files', submission_record.id, array_length(updated_files, 1);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the update
SELECT update_submission_urls();

-- Clean up the temporary function
DROP FUNCTION update_submission_urls();