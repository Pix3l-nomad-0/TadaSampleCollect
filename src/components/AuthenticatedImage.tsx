import React, { useState, useEffect } from 'react'
import { StorageAnonymizer } from '../utils/storageAnonymizer'
import heic2any from 'heic2any'

interface AuthenticatedImageProps {
  filePath?: string
  fileUrl?: string
  fileName: string
  className?: string
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  filePath,
  fileUrl,
  fileName,
  className = ''
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const isHeicFile = (filename: string) => {
    return /\.(heic|heif)$/i.test(filename)
  }

  const convertHeicToJpeg = async (blob: Blob): Promise<Blob> => {
    try {
      const convertedBlob = await heic2any({
        blob,
        toType: 'image/jpeg',
        quality: 0.8
      })
      
      return Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
    } catch (error) {
      console.error('AuthenticatedImage: HEIC conversion failed:', error)
      throw error
    }
  }

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true)
        setError(false)
        
        const anonymizer = StorageAnonymizer.getInstance()
        let actualFilePath: string
        
        // Always extract the relative file path from either prop
        if (filePath) {
          actualFilePath = anonymizer.extractFilePathFromUrl(filePath)
        } else if (fileUrl) {
          actualFilePath = anonymizer.extractFilePathFromUrl(fileUrl)
        } else {
          console.warn('AuthenticatedImage: No file path or URL provided')
          setError(true)
          setLoading(false)
          return
        }
        
        if (!actualFilePath) {
          console.warn('AuthenticatedImage: Failed to extract valid file path', { filePath, fileUrl, fileName })
          setError(true)
          setLoading(false)
          return
        }
        
        console.log('AuthenticatedImage: Loading image with path:', actualFilePath, 'fileName:', fileName)
        
        if (isHeicFile(fileName)) {
          // For HEIC files, download and convert
          console.log('AuthenticatedImage: Processing HEIC file')
          const signedUrl = await anonymizer.createSignedUrl(actualFilePath, 3600)
          
          if (!signedUrl) {
            throw new Error('Failed to create signed URL for HEIC file')
          }
          
          // Download the file
          const response = await fetch(signedUrl)
          if (!response.ok) {
            throw new Error(`Failed to download HEIC file: ${response.statusText}`)
          }
          
          const fileData = await response.blob()
          const convertedBlob = await convertHeicToJpeg(fileData)
          const objectUrl = URL.createObjectURL(convertedBlob)
          
          console.log('AuthenticatedImage: HEIC conversion successful')
          setImageSrc(objectUrl)
        } else {
          // For regular images, create signed URL
          console.log('AuthenticatedImage: Creating signed URL for regular image')
          const signedUrl = await anonymizer.createSignedUrl(actualFilePath, 3600)
          
          if (!signedUrl) {
            throw new Error('Failed to create signed URL')
          }
          
          console.log('AuthenticatedImage: Signed URL created successfully')
          setImageSrc(signedUrl)
        }
      } catch (err) {
        console.error('AuthenticatedImage: Failed to load image:', err, {
          filePath,
          fileUrl,
          fileName
        })
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadImage()
    
    // Cleanup function for HEIC blob URLs
    return () => {
      if (imageSrc && isHeicFile(fileName) && imageSrc.startsWith('blob:')) {
        console.log('AuthenticatedImage: Cleaning up blob URL for HEIC file')
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [filePath, fileUrl, fileName])

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
        <div className="text-xs text-gray-500 text-center p-2">
          <div>Image not available</div>
          <div className="text-xs text-gray-400 mt-1 truncate">{fileName}</div>
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
      onError={() => {
        console.error('AuthenticatedImage: Image failed to load from src:', imageSrc)
        setError(true)
      }}
    />
  )
}