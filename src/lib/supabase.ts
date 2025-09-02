import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const uploadFile = async (file: File, path: string, bucketName: string = 'forms') => {
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    throw error
  }
  
  // Get public URL
  const { data: publicData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path)
  const publicUrl = publicData.publicUrl
  
  return publicUrl
}

export const getFileUrl = (path: string, bucketName: string = 'forms') => {
  const { data: publicData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path)
  return publicData.publicUrl
}

// Types
export interface Form {
  id: string
  name: string
  description: string
  active: boolean
  max_file_count: number
  max_file_size: number
  allowed_file_types: string[]
  guidelines: string
  example_images: string[]
  example_image_captions: string[]
  files_required?: boolean
  created_at: string
  user_id: string
  bucket_name: string
}

export interface FormField {
  id: string
  form_id: string
  field_name: string
  field_key: string
  field_type: 'text' | 'select'
  field_options: string[]
  required: boolean
  order_index: number
}

export interface FormSubmission {
  id: string
  form_id: string
  submitted_data: Record<string, unknown>
  uploaded_files: string[]
  user_email: string
  user_folder?: string
  created_at: string
}