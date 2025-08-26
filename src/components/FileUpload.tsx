import React, { useRef, useState } from 'react'
import { Upload, X, File, Image as ImageIcon, Volume2 } from 'lucide-react'

interface FileUploadProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles: number
  maxFileSize: number
  allowedTypes: string[]
  error?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onChange,
  maxFiles,
  maxFileSize,
  allowedTypes,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (newFiles: File[]) => {
    // Filter files by allowed types
    const validFiles = newFiles.filter(file => 
      allowedTypes.some(allowedType => 
        file.type.match(allowedType.replace('*', '.*'))
      )
    )

    // Combine with existing files, but don't exceed max count
    const combinedFiles = [...files, ...validFiles].slice(0, maxFiles)
    onChange(combinedFiles)
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onChange(newFiles)
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-600" />
    } else if (file.type.startsWith('audio/')) {
      return <Volume2 className="w-5 h-5 text-purple-600" />
    } else {
      return <File className="w-5 h-5 text-gray-600" />
    }
  }

  const isFileTooLarge = (file: File) => {
    return file.size > maxFileSize * 1024 * 1024
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          accept={allowedTypes.join(',')}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="text-center">
          <Upload className={`mx-auto h-12 w-12 ${
            dragActive ? 'text-blue-600' : 'text-gray-400'
          }`} />
          <div className="mt-4">
            <button
              type="button"
              onClick={onButtonClick}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Click to upload
            </button>
            <p className="text-gray-600">or drag and drop files here</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {allowedTypes.map(type => 
              type === 'image/*' ? 'Images' : 
              type === 'audio/*' ? 'Audio' : 
              type === 'video/*' ? 'Videos' : 'Files'
            ).join(', ')} up to {maxFileSize}MB each
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Selected Files ({files.length}/{maxFiles})
          </h4>
          {files.map((file, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                isFileTooLarge(file) ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className={`text-xs ${
                    isFileTooLarge(file) ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {formatFileSize(file.size)}
                    {isFileTooLarge(file) && ' - Too large!'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}