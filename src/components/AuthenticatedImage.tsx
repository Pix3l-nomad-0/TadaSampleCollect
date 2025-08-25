import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface AuthenticatedImageProps {
  fileUrl: string
  fileName: string
  className?: string
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  fileUrl,
  fileName,
  className = ''
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Extract the path from the public URL
        const urlParts = fileUrl.split('/storage/v1/object/public/forms/')
        if (urlParts.length !== 2) {
          throw new Error('Invalid file URL format')
        }
        
        const filePath = urlParts[1]
        
        // Get signed URL with authentication
        const { data, error } = await supabase.storage
          .from('forms')
          .createSignedUrl(filePath, 3600) // 1 hour expiry
        
        if (error) throw error
        
        setImageSrc(data.signedUrl)
      } catch (err) {
        console.error('Failed to load authenticated image:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadImage()
  }, [fileUrl])

  if (loading) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-xs text-gray-500 text-center">
          <div>Image not available</div>
          <div className="text-xs text-gray-400 mt-1">{fileName}</div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={fileName}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  )
}