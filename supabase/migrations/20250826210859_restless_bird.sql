/*
  # Update old submission URLs to new format

  1. Purpose
    - Convert old UUID-based file paths to new form-based paths
    - Update uploaded_files URLs in form_submissions table
    - Match existing file structure in storage

  2. Changes
    - Replace uuid_xxxxx paths with form_name paths
    - Maintain file organization: form_name/user_id/submission_id/filename
    - Update all existing submissions with old URL format

  3. Process
    - Find submissions with old UUID-based URLs
    - Get form name for each submission
    - Generate new URLs with proper form-based paths
    - Update uploaded_files array with new URLs
*/

DO $$
DECLARE
    submission_record RECORD;
    form_record RECORD;
    old_url TEXT;
    new_url TEXT;
    new_urls TEXT[] := '{}';
    clean_form_name TEXT;
    user_id_part TEXT;
    submission_id_part TEXT;
    filename_part TEXT;
    url_parts TEXT[];
BEGIN
    -- Loop through all submissions that have uploaded files with old UUID format
    FOR submission_record IN 
        SELECT id, form_id, uploaded_files, user_email
        FROM form_submissions 
        WHERE array_length(uploaded_files, 1) > 0
        AND EXISTS (
            SELECT 1 FROM unnest(uploaded_files) AS url 
            WHERE url LIKE '%/forms/uuid_%'
        )
    LOOP
        -- Get the form name for this submission
        SELECT name INTO form_record
        FROM forms 
        WHERE id = submission_record.form_id;
        
        IF form_record.name IS NOT NULL THEN
            -- Clean the form name for path usage
            clean_form_name := lower(regexp_replace(regexp_replace(form_record.name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '_', 'g'));
            
            -- Reset new_urls array for this submission
            new_urls := '{}';
            
            -- Process each uploaded file URL
            FOREACH old_url IN ARRAY submission_record.uploaded_files
            LOOP
                -- Only process URLs with old UUID format
                IF old_url LIKE '%/forms/uuid_%' THEN
                    -- Extract parts from old URL: /forms/uuid_xxxxx/uuid_xxxxx/submission_id/filename
                    url_parts := string_to_array(split_part(old_url, '/forms/', 2), '/');
                    
                    IF array_length(url_parts, 1) >= 4 THEN
                        -- Extract user_id (from uuid_xxxxx), submission_id, and filename
                        user_id_part := 'user_' || substring(url_parts[1] FROM 6); -- Remove 'uuid_' prefix
                        submission_id_part := url_parts[3];
                        filename_part := url_parts[4];
                        
                        -- Build new URL with form-based structure
                        new_url := split_part(old_url, '/forms/', 1) || '/forms/' || 
                                  clean_form_name || '/' || 
                                  user_id_part || '/' || 
                                  submission_id_part || '/' || 
                                  filename_part;
                        
                        -- Add to new URLs array
                        new_urls := array_append(new_urls, new_url);
                        
                        RAISE NOTICE 'Converting URL for submission %: % -> %', 
                            submission_record.id, old_url, new_url;
                    ELSE
                        -- Keep original URL if we can't parse it properly
                        new_urls := array_append(new_urls, old_url);
                        RAISE NOTICE 'Could not parse URL, keeping original: %', old_url;
                    END IF;
                ELSE
                    -- Keep URLs that don't match old format
                    new_urls := array_append(new_urls, old_url);
                END IF;
            END LOOP;
            
            -- Update the submission with new URLs
            UPDATE form_submissions 
            SET uploaded_files = new_urls
            WHERE id = submission_record.id;
            
            RAISE NOTICE 'Updated submission % with % files', 
                submission_record.id, array_length(new_urls, 1);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: Updated old UUID-based URLs to new form-based format';
END $$;