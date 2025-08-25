/*
  # Data Collection System Schema

  1. New Tables
    - `forms`
      - `id` (uuid, primary key)
      - `name` (text, form name)
      - `description` (text, form description)
      - `active` (boolean, form status)
      - `max_file_count` (integer, max files per submission)
      - `max_file_size` (integer, max file size in MB)
      - `allowed_file_types` (text[], allowed MIME types)
      - `guidelines` (text, markdown content)
      - `example_images` (text[], example image URLs)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)

    - `form_fields`
      - `id` (uuid, primary key)
      - `form_id` (uuid, foreign key to forms)
      - `field_name` (text, field display name)
      - `field_key` (text, field identifier)
      - `field_type` (text, 'text' or 'select')
      - `field_options` (text[], options for select fields)
      - `required` (boolean)
      - `order_index` (integer)

    - `form_submissions`
      - `id` (uuid, primary key)
      - `form_id` (uuid, foreign key to forms)
      - `submitted_data` (jsonb, form field values)
      - `uploaded_files` (text[], file URLs)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their forms
    - Add policies for public form submissions
*/

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  active boolean DEFAULT true,
  max_file_count integer DEFAULT 5,
  max_file_size integer DEFAULT 10,
  allowed_file_types text[] DEFAULT ARRAY['image/*', 'audio/*'],
  guidelines text DEFAULT '',
  example_images text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create form_fields table
CREATE TABLE IF NOT EXISTS form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  field_key text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'select')),
  field_options text[] DEFAULT ARRAY[]::text[],
  required boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  submitted_data jsonb DEFAULT '{}',
  uploaded_files text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Forms policies
CREATE POLICY "Users can view their own forms"
  ON forms FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own forms"
  ON forms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms"
  ON forms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forms"
  ON forms FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active forms"
  ON forms FOR SELECT
  TO anon
  USING (active = true);

-- Form fields policies
CREATE POLICY "Users can manage fields for their forms"
  ON form_fields FOR ALL
  TO authenticated
  USING (
    form_id IN (
      SELECT id FROM forms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view fields for active forms"
  ON form_fields FOR SELECT
  TO anon
  USING (
    form_id IN (
      SELECT id FROM forms WHERE active = true
    )
  );

-- Form submissions policies
CREATE POLICY "Users can view submissions for their forms"
  ON form_submissions FOR SELECT
  TO authenticated
  USING (
    form_id IN (
      SELECT id FROM forms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create submissions for active forms"
  ON form_submissions FOR INSERT
  TO anon
  WITH CHECK (
    form_id IN (
      SELECT id FROM forms WHERE active = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_order ON form_fields(form_id, order_index);