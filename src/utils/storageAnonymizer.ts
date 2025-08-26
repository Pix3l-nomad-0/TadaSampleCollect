import { supabase } from '../lib/supabase'

export class StorageAnonymizer {
  private static instance: StorageAnonymizer
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): StorageAnonymizer {
    if (!StorageAnonymizer.instance) {
      StorageAnonymizer.instance = new StorageAnonymizer()
    }
    return StorageAnonymizer.instance
  }
  
  /**
   * Generate a simple hash-based UUID for email (for anonymous users)
   */
  private generateStorageUuidFromEmail(email: string): string {
    // Create a simple hash from email for consistent anonymization
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to a UUID-like format
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0')
    return `${hashStr.slice(0, 8)}-${hashStr.slice(0, 4)}-4${hashStr.slice(1, 4)}-8${hashStr.slice(2, 5)}-${hashStr}${hashStr.slice(0, 4)}`
  }
  
  /**
   * Generate anonymous path for new upload
   */
  async generateAnonymousPath(userEmail: string, formName: string, submissionId: string, fileName: string): Promise<string> {
    const storageUuid = this.generateStorageUuidFromEmail(userEmail)
    
    // Build anonymous path: clean_form_name/user_id/submission_id/filename
    const cleanFormName = formName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase()
    const userId = `user_${storageUuid.replace(/-/g, '').substring(0, 8)}`
    
    const path = `${cleanFormName}/${userId}/${submissionId}/${fileName}`
    return path
  }

  /**
   * Create a signed URL for a file path
   */
  async createSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    if (!filePath || filePath.trim() === '') {
      console.warn('StorageAnonymizer: Empty filePath provided to createSignedUrl')
      return null
    }

    try {
      console.log('StorageAnonymizer: Creating signed URL for path:', filePath)
      
      const { data, error } = await supabase.storage
        .from('forms')
        .createSignedUrl(filePath, expiresIn)
      
      if (error) {
        console.error('StorageAnonymizer: Error creating signed URL:', error)
        throw error
      }
      
      if (!data?.signedUrl) {
        console.error('StorageAnonymizer: No signed URL returned for path:', filePath)
        return null
      }
      
      console.log('StorageAnonymizer: Successfully created signed URL for:', filePath)
      return data?.signedUrl || null
    } catch (error) {
      console.error('StorageAnonymizer: Failed to create signed URL for path:', filePath, 'Error:', error)
      return null
    }
  }
  
  /**
   * Extract file path from various URL formats or return as-is if already a path
   */
  extractFilePathFromUrl(urlOrPath: string): string | null {
    if (!urlOrPath || urlOrPath.trim() === '') {
      return null
    }
    
    // If it's already a path (doesn't start with http), return as-is
    if (!urlOrPath.startsWith('http')) {
      return urlOrPath
    }
    
    // More robust regex to handle all Supabase storage URL formats
    // Matches: https://xxx.supabase.co/storage/v1/object/{public|sign|authenticated}/forms/path/to/file
    const storageMatch = urlOrPath.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/forms\/(.+?)(?:\?.*)?$/)
    if (storageMatch) {
      return storageMatch[1]
    }
    
    console.warn('StorageAnonymizer: Could not extract file path from URL:', urlOrPath)
    return null
  }
}