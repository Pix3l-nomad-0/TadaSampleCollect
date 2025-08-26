import React, { useState, useEffect } from 'react'
import { StorageAnonymizer } from '../utils/storageAnonymizer'
import { Play } from 'lucide-react'

interface AuthenticatedVideoProps {
  filePath?: string
  fileUrl?: string
  fileName: string
  className?: string
}

export const AuthenticatedVideo: React.FC<AuthenticatedVideoProps> = ({
  filePath,
  fileUrl,
  fileName,
  className = ''
}) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const loadVideo = async () => {
      try {
        setLoading(true)
        setError(false)
        
        const anonymizer = StorageAnonymizer.getInstance()
        let actualFilePath: string | null = null
        
        // Always extract the relative file path from either prop
        if (filePath) {
          actualFilePath = anonymizer.extractFilePathFromUrl(filePath)
        } else if (fileUrl) {
          actualFilePath = anonymizer.extractFilePathFromUrl(fileUrl)
        }
        
        if (!actualFilePath) {
          console.warn('AuthenticatedVideo: Failed to extract valid file path', { filePath, fileUrl, fileName })
          setError(true)
          setLoading(false)
          return
        }
        
        console.log('AuthenticatedVideo: Loading video with path:', actualFilePath, 'fileName:', fileName)
        
        // Create signed URL for video
        const signedUrl = await anonymizer.createSignedUrl(actualFilePath, 3600)
        
        if (!signedUrl) {
          throw new Error('Failed to create signed URL')
        }
        
        console.log('AuthenticatedVideo: Signed URL created successfully')
        setVideoSrc(signedUrl)
      } catch (err) {
        console.error('AuthenticatedVideo: Failed to load video:', err, {
          filePath,
          fileUrl,
          fileName
        })
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadVideo()
  }, [filePath, fileUrl, fileName])

  if (loading) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error || !videoSrc) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-xs text-gray-500 text-center p-2">
          <Play className="w-6 h-6 mx-auto mb-1 text-gray-400" />
          <div>Video not available</div>
          <div className="text-xs text-gray-400 mt-1 truncate">{fileName}</div>
        </div>
      </div>
    )
  }

  return (
    <video
      src={videoSrc}
      className={className}
      controls
      preload="metadata"
      onError={() => {
        console.error('AuthenticatedVideo: Video failed to load from src:', videoSrc)
        setError(true)
      }}
    >
      Your browser does not support the video tag.
    </video>
  )
}