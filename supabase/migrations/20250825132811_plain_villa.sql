/*
  # Add user email to form submissions

  1. Changes
    - Add `user_email` column to `form_submissions` table
    - Update RLS policies to maintain security

  2. Security
    - Maintains existing RLS policies
    - User email is collected but doesn't affect access control
*/

-- Add user_email column to form_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_submissions' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE form_submissions ADD COLUMN user_email text;
  END IF;
END $$;