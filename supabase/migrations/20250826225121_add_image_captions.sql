-- Add example_image_captions field to forms table
-- This will store captions for each example image as a JSON array

ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS example_image_captions JSONB DEFAULT '[]'::jsonb;

-- Update existing forms to have empty captions array
UPDATE forms 
SET example_image_captions = '[]'::jsonb 
WHERE example_image_captions IS NULL;

-- Add comment to document the new field
COMMENT ON COLUMN forms.example_image_captions IS 'Array of captions for example images, stored as JSON array of strings';
