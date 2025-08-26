/*
  # Fix migration path structure

  1. Updates
    - Fix the migrate_submission_files function to maintain proper folder structure
    - Keep form bucket name as first level (e.g., ocr_ticket___receipt_e12cae31)
    - Replace email with UUID as second level
    - Keep session ID as third level
    - Files as fourth level

  2. Structure
    - BEFORE: form_name/email@domain.com/session_id/file.jpg
    - AFTER:  form_name/uuid_12345678/session_id/file.jpg
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
    new_files text[] := '{}';
    form_bucket_name text;
    path_parts text[];
    file_name text;
    session_id text;
BEGIN
    -- Get submission details
    SELECT * INTO submission_record
    FROM form_submissions 
    WHERE id = submission_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
    END IF;
    
    -- Get form details
    SELECT * INTO form_record
    FROM forms 
    WHERE id = submission_record.form_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Form not found');
    END IF;
    
    -- Get or create storage UUID for the email
    SELECT get_or_create_storage_uuid(submission_record.user_email) INTO storage_uuid_val;
    
    IF storage_uuid_val IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Could not get storage UUID');
    END IF;
    
    -- Create form bucket name (clean form name + form ID prefix)
    form_bucket_name := lower(regexp_replace(form_record.name, '[^a-zA-Z0-9]', '_', 'g')) || '___' || 
                       regexp_replace(form_record.id::text, '-', '', 'g');
    form_bucket_name := substring(form_bucket_name from 1 for 50); -- Limit length
    
    -- Process each uploaded file
    FOREACH old_file_url IN ARRAY submission_record.uploaded_files
    LOOP
        -- Extract path from URL
        -- URL format: https://...supabase.co/storage/v1/object/public/forms/path
        IF old_file_url LIKE '%/storage/v1/object/public/forms/%' THEN
            old_path := split_part(old_file_url, '/storage/v1/object/public/forms/', 2);
            
            -- Parse old path: form_bucket/email/session_id/filename
            path_parts := string_to_array(old_path, '/');
            
            IF array_length(path_parts, 1) >= 3 THEN
                -- Extract session ID and filename
                session_id := path_parts[3];
                file_name := path_parts[array_length(path_parts, 1)];
                
                -- Create new path: form_bucket/uuid_XXXXXXXX/session_id/filename
                new_path := form_bucket_name || '/uuid_' || 
                           substring(replace(storage_uuid_val::text, '-', '') from 1 for 8) || '/' ||
                           session_id || '/' || file_name;
                
                -- Create new URL
                new_file_url := replace(old_file_url, old_path, new_path);
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
    
    -- Update the submission with new file URLs
    UPDATE form_submissions 
    SET uploaded_files = new_files
    WHERE id = submission_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'old_files', submission_record.uploaded_files,
        'new_files', new_files,
        'storage_uuid', storage_uuid_val
    );
END;
$$;