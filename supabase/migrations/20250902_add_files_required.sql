-- Add files_required flag to forms
ALTER TABLE IF EXISTS public.forms
ADD COLUMN IF NOT EXISTS files_required boolean NOT NULL DEFAULT false;
