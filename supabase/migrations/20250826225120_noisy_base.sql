/*
  # Populate user_folder from uploaded_files URLs

  This migration extracts user folder names from the existing uploaded_files URLs
  and populates the user_folder column for existing submissions.

  1. Extract file paths from Supabase storage URLs
  2. Parse the user_xxxx folder from the path structure
  3. Update the user_folder column with the extracted folder name
*/

-- Update user_folder by extracting from the uploaded_files URLs
UPDATE form_submissions 
SET user_folder = (
  SELECT DISTINCT split_part(
    -- Extract path from URL: remove everything before '/object/public/forms/'
    substring(
      file_url 
      FROM '/object/public/forms/(.+?)(?:\?|$)'
    ),
    '/', -- Split by slash
    2   -- Take the 2nd part (user_xxxx)
  )
  FROM unnest(uploaded_files) AS file_url
  WHERE file_url LIKE '%/object/public/forms/%'
    AND split_part(
      substring(
        file_url 
        FROM '/object/public/forms/(.+?)(?:\?|$)'
      ),
      '/', 
      2
    ) LIKE 'user_%'
  LIMIT 1
)
WHERE user_folder IS NULL 
  AND array_length(uploaded_files, 1) > 0;

-- Clean up any entries that don't match the expected pattern
UPDATE form_submissions 
SET user_folder = NULL 
WHERE user_folder IS NOT NULL 
  AND user_folder NOT LIKE 'user_%';