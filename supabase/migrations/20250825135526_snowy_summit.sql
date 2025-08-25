/*
  # Add bucket_name column to forms table

  1. Changes
    - Add `bucket_name` column to `forms` table to store the specific bucket name for each form
    - This allows each form to have its own dedicated storage bucket for better organization and security
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forms' AND column_name = 'bucket_name'
  ) THEN
    ALTER TABLE forms ADD COLUMN bucket_name text;
  END IF;
END $$;