/*
  # Setup automatic profile creation with manual admin approval

  1. New Features
    - Automatically create profile when user signs up
    - All users start with `is_admin: false`
    - Admin manually sets `is_admin: true` in Supabase dashboard
  
  2. Security
    - Only users with `is_admin: true` can access admin features
    - All signups create profiles automatically
    - Manual approval process via Supabase dashboard
  
  3. Changes
    - Add trigger to create profile on user signup
    - Update RLS policies for admin-only access
    - Remove approved_admins table (not needed)
*/

-- Drop the approved_admins table if it exists (we don't need it anymore)
DROP TABLE IF EXISTS approved_admins;

-- Create or replace the trigger function to handle new user signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (new.id, new.email, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to ensure only approved admins can access admin features
DROP POLICY IF EXISTS "Only approved admins can manage forms" ON forms;
CREATE POLICY "Only approved admins can manage forms"
  ON forms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Update form_fields policies
DROP POLICY IF EXISTS "Users can manage fields for their forms" ON form_fields;
CREATE POLICY "Only approved admins can manage form fields"
  ON form_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Update form_submissions policies for admin viewing
DROP POLICY IF EXISTS "Users can view submissions for their forms" ON form_submissions;
CREATE POLICY "Only approved admins can view submissions"
  ON form_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );