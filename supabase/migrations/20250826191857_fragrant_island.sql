/*
  # Fix migration path structure

  1. Updates
    - Fix the migrate_submission_files function to maintain proper folder structure
    - Keep form bucket name (e.g., ocr_ticket___receipt_e12cae31)
    - Replace email folder with UUID folder
    - Keep session ID and file structure

  2. Path Structure
    - BEFORE: ocr_ticket___receipt_e12cae31/email@domain.com/session_id/file.jpg
    - AFTER:  ocr_ticket___receipt_e12cae31/uuid_12345678/session_id/file.jpg
*/

CREATE OR REPLACE FUNCTION migrate_submission_files(submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    submission_record RECORD;
    form_record RECORD;
    storage_uuid_val uuid;
    old_file_url text;
    new_file_url text;
    old_path text;
    new_path text;
    path_parts text[];
    form_bucket text;
    session_part text;
    file_name text;
    new_files text[] := '{}';
    short_uuid text;
BEGIN
    -- Get submission data
    SELECT * INTO submission_record
    FROM form_submissions
    WHERE id = submission_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
    END IF;
    
    -- Get form data
    SELECT * INTO form_record
    FROM forms
    WHERE id = submission_record.form_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Form not found');
    END IF;
    
    -- Get or create storage UUID for the user email
    SELECT storage_uuid INTO storage_uuid_val
    FROM email_storage_mapping
    WHERE email = submission_record.user_email;
    
    IF NOT FOUND THEN
        INSERT INTO email_storage_mapping (email)
        VALUES (submission_record.user_email)
        RETURNING storage_uuid INTO storage_uuid_val;
    END IF;
    
    -- Create short UUID (8 characters)
    short_uuid := replace(storage_uuid_val::text, '-', '')::text;
    short_uuid := substring(short_uuid, 1, 8);
    
    -- Process each file URL
    FOR i IN 1..array_length(submission_record.uploaded_files, 1) LOOP
        old_file_url := submission_record.uploaded_files[i];
        
        -- Extract path from URL
        -- URL format: https://domain/storage/v1/object/public/forms/path
        IF old_file_url LIKE '%/storage/v1/object/public/forms/%' THEN
            old_path := split_part(old_file_url, '/storage/v1/object/public/forms/', 2);
            
            -- Split path into parts
            -- Expected: form_bucket/email/session_id/file.jpg
            path_parts := string_to_array(old_path, '/');
            
            IF array_length(path_parts, 1) >= 3 THEN
                form_bucket := path_parts[1];  -- e.g., ocr_ticket___receipt_e12cae31
                -- Skip email part (path_parts[2])
                session_part := path_parts[3]; -- session ID
                file_name := path_parts[4];    -- file name
                
                -- Build new path: form_bucket/uuid_12345678/session_id/file.jpg
                new_path := form_bucket || '/uuid_' || short_uuid || '/' || session_part || '/' || file_name;
                
                -- Build new URL
                new_file_url := split_part(old_file_url, '/storage/v1/object/public/forms/', 1) || 
                               '/storage/v1/object/public/forms/' || new_path;
                
                new_files := array_append(new_files, new_file_url);
            ELSE
                -- Keep original if path structure is unexpected
                new_files := array_append(new_files, old_file_url);
            END IF;
        ELSE
            -- Keep original if URL format is unexpected
            new_files := array_append(new_files, old_file_url);
        END IF;
    END LOOP;
    
    -- Update submission with new file URLs
    UPDATE form_submissions
    SET uploaded_files = new_files
    WHERE id = submission_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'old_files', submission_record.uploaded_files,
        'new_files', new_files
    );
END;
$$;