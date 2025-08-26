/*
  # Update forms table bucket_name default

  1. Changes
    - Set default value for bucket_name to 'forms'
    - Update existing NULL bucket_name values to 'forms'

  2. Security
    - No RLS changes needed
*/

-- Update existing NULL bucket_name values to 'forms'
UPDATE forms SET bucket_name = 'forms' WHERE bucket_name IS NULL;

-- Set default value for future inserts
ALTER TABLE forms ALTER COLUMN bucket_name SET DEFAULT 'forms';