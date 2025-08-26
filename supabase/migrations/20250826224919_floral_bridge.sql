/*
  # Populate user_folder for existing submissions

  1. Updates
    - Extract user folder from existing uploaded_files paths
    - Update form_submissions.user_folder with extracted folder names
  
  2. Logic
    - Parse the file paths in uploaded_files array
    - Extract the user_xxxx folder name from the path structure
    - Update the user_folder column with the extracted value
*/

-- Update existing submissions by extracting user folder from uploaded_files paths
UPDATE form_submissions 
SET user_folder = (
  SELECT DISTINCT 
    split_part(split_part(unnest(uploaded_files), '/', 2), '/', 1) as folder_name
  FROM (SELECT uploaded_files) as files
  WHERE array_length(uploaded_files, 1) > 0
  LIMIT 1
)
WHERE user_folder IS NULL 
  AND uploaded_files IS NOT NULL 
  AND array_length(uploaded_files, 1) > 0;

-- Clean up any entries that might have empty folder names
UPDATE form_submissions 
SET user_folder = NULL 
WHERE user_folder = '' OR user_folder NOT LIKE 'user_%';