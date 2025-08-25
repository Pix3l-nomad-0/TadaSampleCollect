/*
  # Add bucket_name column to forms table

  1. Changes
    - Add `bucket_name` column to `forms` table
    - Column is nullable to support existing forms
    - Will store the specific storage bucket name for each form

  2. Purpose
    - Enable form-specific storage buckets
    - Allow better organization of uploaded files
    - Support dynamic bucket creation per form
*/

-- Add bucket_name column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS bucket_name TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN forms.bucket_name IS 'Storage bucket name for form file uploads';