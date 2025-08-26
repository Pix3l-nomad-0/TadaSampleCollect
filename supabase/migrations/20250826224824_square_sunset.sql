/*
  # Add user folder tracking to form submissions

  1. Changes
    - Add `user_folder` column to `form_submissions` table to store the actual folder name used (e.g., "user_0d09455a")
    - This eliminates the need to reverse-engineer the hash function
    - Allows accurate display of folder structure in admin dashboard

  2. Security
    - No changes to existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_submissions' AND column_name = 'user_folder'
  ) THEN
    ALTER TABLE form_submissions ADD COLUMN user_folder text;
  END IF;
END $$;