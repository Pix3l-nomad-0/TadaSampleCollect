import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, Download, FileText } from 'lucide-react'
import { StorageAnonymizer } from '../utils/storageAnonymizer'

interface MediaFilePlayerProps {
  fileUrl: string
  fileName: string
  fileType: string
}

export const MediaFilePlayer: React.FC<MediaFilePlayerProps> = ({ fileUrl, fileName, fileType }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const loadSignedUrl = async () => {
      try {
        setLoading(true)
        setError(false)
        
        const anonymizer = StorageAnonymizer.getInstance()
        const filePath = anonymizer.extractFilePathFromUrl(fileUrl)
        
        if (!filePath) {
          console.warn('MediaFilePlayer: Failed to extract file path from URL:', fileUrl)
          setError(true)
          setLoading(false)
          return
        }
        
        const signed = await anonymizer.createSignedUrl(filePath, 3600)
        if (!signed) {
          throw new Error('Failed to create signed URL')
        }
        
        setSignedUrl(signed)
      } catch (error) {
        console.error('MediaFilePlayer: Error loading signed URL:', error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    if (fileUrl) {
      loadSignedUrl()
    }
  }, [fileUrl])

  const handlePlayPause = () => {
    if (audioRef.current && signedUrl) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleDownload = async () => {
    if (!signedUrl) return
    
    try {
      const response = await fetch(signedUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (error || !signedUrl) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center space-x-2 text-red-600">
          <FileText className="w-5 h-5" />
          <span className="text-sm font-medium truncate">{fileName}</span>
        </div>
        <div className="mt-2 text-xs text-red-500">Failed to load file</div>
      </div>
    )
  }

  if (fileType === 'audio') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
          </div>
          <button
            onClick={handleDownload}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #9333ea ${(currentTime / (duration || 1)) * 100}%, #e5e7eb ${(currentTime / (duration || 1)) * 100}%)`
              }}
            />
          </div>
        </div>
        
        <audio
          ref={audioRef}
          src={signedUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      </div>
    )
  }

  // For other file types, show a simple file info card
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
        </div>
        <button
          onClick={handleDownload}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-500 capitalize">{fileType} file</div>
    </div>
  )
}
