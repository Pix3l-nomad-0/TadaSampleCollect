/*
  # Storage UUID Management Functions

  1. Functions
    - `get_or_create_storage_uuid` - Get or create storage UUID for email
    - `get_email_by_storage_uuid` - Get email by storage UUID (for migration)

  2. Security
    - Functions are accessible to authenticated and anonymous users
    - RLS policies control data access
*/

-- Function to get or create storage UUID for an email
CREATE OR REPLACE FUNCTION get_or_create_storage_uuid(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  storage_id uuid;
BEGIN
  -- Try to get existing storage UUID
  SELECT storage_uuid INTO storage_id
  FROM email_storage_mapping
  WHERE email = user_email;
  
  -- If not found, create new mapping
  IF storage_id IS NULL THEN
    INSERT INTO email_storage_mapping (email)
    VALUES (user_email)
    RETURNING storage_uuid INTO storage_id;
  END IF;
  
  RETURN storage_id;
END;
$$;

-- Function to get email by storage UUID (for migration purposes)
CREATE OR REPLACE FUNCTION get_email_by_storage_uuid(storage_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM email_storage_mapping
  WHERE storage_uuid = storage_id;
  
  RETURN user_email;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_storage_uuid(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_email_by_storage_uuid(uuid) TO anon, authenticated;