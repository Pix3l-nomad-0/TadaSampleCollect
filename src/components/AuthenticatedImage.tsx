import React, { useState, useEffect } from 'react'
import { StorageAnonymizer } from '../utils/storageAnonymizer'
import heic2any from 'heic2any'

interface AuthenticatedImageProps {
  filePath?: string
  fileUrl?: string
  fileName: string
  className?: string
  shouldLoad?: boolean
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  filePath,
  fileUrl,
  fileName,
  className = '',
  shouldLoad = false
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
  console.log('AuthenticatedImage: start load', { filePath, fileUrl, fileName, shouldLoad })
        let actualFilePath: string | null = null

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

        // Determine whether the caller provided a full URL (fileUrl or filePath)
        const providedUrl = fileUrl ? fileUrl : (filePath && filePath.startsWith('http') ? filePath : undefined)

        // If a full URL was provided, use it immediately (no Supabase call needed)
        if (providedUrl && providedUrl.startsWith('http')) {
          setImageSrc(providedUrl)
          setLoading(false)
          return
        }

        // Try to use cached signed URL next. If not present, only fetch when shouldLoad is true
        const cached = actualFilePath ? anonymizer.getCachedSignedUrl(actualFilePath) : null
        if (cached) {
          setImageSrc(cached)
          setLoading(false)
          return
        }

        if (!shouldLoad) {
          // Do not request a signed URL yet; placeholder will be shown
          setLoading(false)
          return
        }

        // For HEIC files, download and convert
        if (isHeicFile(fileName)) {
          const signedUrl = await anonymizer.createSignedUrl(actualFilePath)

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
          // ensure we don't set state if unmounted
          setImageSrc(objectUrl)
        } else {
          // For regular images, create signed URL if needed
          // If a full URL was provided (either via fileUrl or filePath), use it directly
          if (providedUrl && providedUrl.startsWith('http')) {
            setImageSrc(providedUrl)
          } else {
            const signedUrl = await anonymizer.createSignedUrl(actualFilePath)
            if (!signedUrl) throw new Error('Failed to create signed URL')
            setImageSrc(signedUrl)
          }
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

    let cancelled = false
    const wrapped = async () => {
      if (cancelled) return
      await loadImage()
    }
    wrapped()
    
    // Cleanup function for HEIC blob URLs
    return () => {
      cancelled = true
      if (imageSrc && isHeicFile(fileName) && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  // Re-run when shouldLoad changes so user toggles trigger loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, fileUrl, fileName, shouldLoad])

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