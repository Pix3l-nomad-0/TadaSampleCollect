import React, { useState, useEffect } from 'react'
import { supabase, Form, FormField, FormSubmission } from '../lib/supabase'
import { StorageAnonymizer } from '../utils/storageAnonymizer'
import { ArrowLeft, Download, Calendar, User, FileText, Volume2, X, ZoomIn, Grid, Archive } from 'lucide-react'
import { AuthenticatedImage } from './AuthenticatedImage'
import { AuthenticatedVideo } from './AuthenticatedVideo'
import { MediaFilePlayer } from './MediaFilePlayer'
import JSZip from 'jszip'

interface FormSubmissionsProps {
  formId: string
  onBack: () => void
}

interface ImageModalProps {
  isOpen: boolean
  imageUrl: string
  fileName: string
  onClose: () => void
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, fileName, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-full">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        <AuthenticatedImage
          filePath={imageUrl}
          fileName={fileName}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          shouldLoad={true}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
          <p className="text-sm truncate">{fileName}</p>
        </div>
      </div>
    </div>
  )
}

export const FormSubmissions: React.FC<FormSubmissionsProps> = ({ formId, onBack }) => {
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<{ url: string; fileName: string } | null>(null)
  // Track which submissions have image loading enabled
  const [loadImagesForSubmission, setLoadImagesForSubmission] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadData()
  }, [formId])

  const loadData = async () => {
    try {
      const [formResponse, fieldsResponse, submissionsResponse] = await Promise.all([
        supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .single(),
        supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formId)
          .order('order_index'),
        supabase
          .from('form_submissions')
          .select('*')
          .eq('form_id', formId)
          .order('created_at', { ascending: false })
      ])

      if (formResponse.error) throw formResponse.error
      if (fieldsResponse.error) throw fieldsResponse.error
      if (submissionsResponse.error) throw submissionsResponse.error

      setForm(formResponse.data)
      setFields(fieldsResponse.data || [])
      setSubmissions(submissionsResponse.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportSubmissions = () => {
    if (!form || submissions.length === 0) return

    const exportData = async () => {
      console.log('FormSubmissions: Starting CSV export for', submissions.length, 'submissions')
      const anonymizer = StorageAnonymizer.getInstance()
      
      // Find the maximum number of files in any submission
      const maxFiles = Math.max(...submissions.map(s => s.uploaded_files.length), 1)
      
      // Headers avec informations détaillées
      const headers = [
        'Submission ID',
        ...fields.map(f => f.field_name),
        'Files Count'
      ]
      
      // Add file columns
      for (let i = 1; i <= maxFiles; i++) {
        headers.push(`File ${i} Name`)
        headers.push(`File ${i} URL`)
      }
      
      const rows = await Promise.all(
        submissions.map(async (submission) => {
          const fileData: string[] = []
          
          if (submission.uploaded_files.length > 0) {
            try {
              for (const fileUrl of submission.uploaded_files) {
                const filePath = anonymizer.extractFilePathFromUrl(fileUrl)
                if (filePath) {
                  console.log('FormSubmissions: Processing file for CSV export:', filePath)
                  const fileName = filePath.split('/').pop() || 'unknown'
                  const signedUrl = await anonymizer.createSignedUrl(filePath, 432000) // 5 days (5 * 24 * 60 * 60)
                  
                  if (signedUrl) {
                    fileData.push(fileName)
                    fileData.push(signedUrl)
                  } else {
                    fileData.push(fileName)
                    fileData.push('Error: Could not generate download URL')
                  }
                } else {
                  console.warn('FormSubmissions: Could not extract file path from URL for CSV export:', fileUrl)
                  fileData.push('Unknown file')
                  fileData.push('Error: Invalid file path')
                }
              }
            } catch (error) {
              console.error('FormSubmissions: Error generating signed URLs for CSV export:', error)
              for (let i = 0; i < submission.uploaded_files.length; i++) {
                fileData.push('Error retrieving file name')
                fileData.push('Error: Could not process file')
              }
            }
          }
          
          // Pad with empty values if this submission has fewer files than maxFiles
          while (fileData.length < maxFiles * 2) {
            fileData.push('') // Empty file name
            fileData.push('') // Empty URL
          }
          
          // submissionDate intentionally unused (kept for potential future metadata)
          return [
            submission.id.slice(0, 8), // Short ID
            ...fields.map(field => submission.submitted_data[field.field_key] || ''),
            submission.uploaded_files.length.toString(),
            ...fileData
          ]
        })
      )

      // Ajouter des métadonnées en en-tête
      const metadata = [
        [`Form: ${form.name}`],
        [`Export Date: ${new Date().toLocaleString()}`],
        [`Total Submissions: ${submissions.length}`],
        [`Generated by: Data Collection System`],
        [''], // Ligne vide
        ['IMPORTANT: Download URLs are valid for 5 days. Files are organized in separate columns for easy access.'],
        [''], // Ligne vide
      ]

      const csvContent = [
        ...metadata,
        headers,
        ...rows
      ]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      // Créer le fichier avec un nom plus descriptif
      const timestamp = new Date().toISOString().slice(0, 10)
      const fileName = `${form.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export_${timestamp}.csv`

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      
      console.log('FormSubmissions: CSV export completed:', fileName)
    }
    
    exportData()
  }

  const getFileType = (url: string) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) return 'image'
    if (url.match(/\.(mp4|mov|avi|webm|mkv)$/i)) return 'video'
    if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) return 'audio'
    return 'unknown'
  }

  const getFileName = (url: string) => {
    return url.split('/').pop()?.split('?')[0] || 'file'
  }

  const downloadSubmissionFiles = async (submission: FormSubmission) => {
    try {
      console.log('FormSubmissions: Starting ZIP download for submission:', submission.id)
      const anonymizer = StorageAnonymizer.getInstance()
      const zip = new JSZip()
      const submissionFolder = zip.folder(`submission_${submission.id.slice(0, 8)}`)
      
      // Download and add each file to the ZIP
      for (let i = 0; i < submission.uploaded_files.length; i++) {
        const fileUrl = submission.uploaded_files[i]
        console.log('FormSubmissions: Processing file for ZIP:', fileUrl)
        try {
          const filePath = anonymizer.extractFilePathFromUrl(fileUrl)
          if (!filePath) {
            console.warn('FormSubmissions: Could not extract file path from URL for ZIP:', fileUrl)
            continue
          }
          
          console.log('FormSubmissions: Downloading file for ZIP:', filePath)
          const { data: fileData, error } = await supabase.storage
            .from('forms')
            .download(filePath)
          
          if (error) {
            console.error('FormSubmissions: Error downloading file for ZIP:', error, 'Path:', filePath)
            continue
          }
          
          // Get original filename from the path
          const fileName = filePath.split('/').pop() || `file_${i + 1}`
          console.log('FormSubmissions: Adding file to ZIP:', fileName)
          
          // Add file to ZIP
          submissionFolder?.file(fileName, fileData)
        } catch (error) {
          console.error('FormSubmissions: Error processing file for ZIP:', error, 'URL:', fileUrl)
        }
      }
      
      console.log('FormSubmissions: Generating ZIP blob')
      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      // Create download link
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${form?.name.replace(/[^a-z0-9]/gi, '_')}_${submission.user_email}_${submission.id.slice(0, 8)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      
      console.log('FormSubmissions: ZIP download completed')
    } catch (error) {
      console.error('FormSubmissions: Error creating ZIP:', error)
      alert('Error creating download. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading submissions...</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Form not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-700">
          Go back
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Forms</span>
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{form.name} Submissions</h2>
              <p className="text-sm text-gray-600">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          {submissions.length > 0 && (
            <button
              onClick={exportSubmissions}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
            <p className="text-gray-600">Submissions will appear here once users start filling out your form.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                {/* Compact Header */}
                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                      <span className="text-gray-400">at</span>
                      <span>{new Date(submission.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {submission.user_email && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{submission.user_email}</span>
                      </div>
                    )}
                    {submission.user_folder && (
                      <div className="flex items-center space-x-1 text-gray-500">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{submission.user_folder}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    <div>ID: {submission.id.slice(0, 8)}</div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Form Data - Compact */}
                    {fields.length > 0 && (
                      <div className="lg:col-span-1">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          Form Data
                        </h4>
                        <div className="space-y-1 text-sm">
                          {fields.map((field) => (
                            <div key={field.id} className="flex">
                              <dt className="text-gray-600 w-20 flex-shrink-0 text-xs">
                                {field.field_name}:
                              </dt>
                              <dd className="text-gray-900 flex-1 font-medium">
                                {String(submission.submitted_data[field.field_key] ?? '-')}
                              </dd>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Images Grid - Prominent */}
                    {submission.uploaded_files.length > 0 && (
                      <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                            <Grid className="w-3 h-3 mr-1" />
                            Images ({submission.uploaded_files.filter(url => getFileType(url) === 'image').length})
                          </h4>
                          <div>
                            <button
                              onClick={() => setLoadImagesForSubmission(prev => ({ ...prev, [submission.id]: !prev[submission.id] }))}
                              className="text-sm px-2 py-1 border rounded text-blue-600 hover:bg-blue-50"
                            >
                              {loadImagesForSubmission[submission.id] ? 'Unload images' : 'Load images'}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {submission.uploaded_files.map((fileUrl, index) => {
                            const fileType = getFileType(fileUrl)
                            const fileName = getFileName(fileUrl)
                            
                            if (fileType === 'image') {
                              return (
                                <div key={index} className="group relative aspect-square">
                                  <AuthenticatedImage
                                    filePath={fileUrl}
                                    fileName={fileName}
                                    className="w-full h-full object-cover rounded border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
                                    shouldLoad={!!loadImagesForSubmission[submission.id]}
                                  />
                                  <button
                                    onClick={() => setSelectedImage({ url: fileUrl, fileName })}
                                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center"
                                  >
                                    <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="truncate">{fileName}</div>
                                  </div>
                                </div>
                              )
                            } else if (fileType === 'video') {
                              return (
                                <div key={index} className="group relative aspect-square">
                                  <AuthenticatedVideo
                                    filePath={fileUrl}
                                    fileName={fileName}
                                    className="w-full h-full object-cover rounded border border-gray-200"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="truncate">{fileName}</div>
                                  </div>
                                </div>
                              )
                            } else if (fileType === 'audio') {
                              return (
                                <div key={index} className="aspect-square bg-purple-50 border border-purple-200 rounded flex flex-col items-center justify-center p-1">
                                  <Volume2 className="w-4 h-4 text-purple-600 mb-1" />
                                  <div className="text-xs text-purple-600 text-center">Audio</div>
                                </div>
                              )
                            } else {
                              return (
                                <div key={index} className="aspect-square bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center p-1">
                                  <FileText className="w-4 h-4 text-gray-600 mb-1" />
                                  <div className="text-xs text-gray-600 text-center">File</div>
                                </div>
                              )
                            }
                          })}
                        </div>
                        
                        {/* Audio files separately if any */}
                        {submission.uploaded_files.some(url => getFileType(url) === 'audio') && (
                          <div className="mt-3">
                            <h5 className="text-xs font-medium text-gray-700 mb-2">Audio Files</h5>
                            <div className="space-y-2">
                              {submission.uploaded_files
                                .filter(url => getFileType(url) === 'audio')
                                .map((fileUrl, index) => {
                                  const fileName = getFileName(fileUrl)
                                  return (
                                    <MediaFilePlayer
                                      key={index}
                                      fileUrl={fileUrl}
                                      fileName={fileName}
                                      fileType={getFileType(fileUrl)}
                                    />
                                  )
                                })}
                            </div>
                          </div>
                        )}
                        
                        {/* Download All Files as ZIP */}
                        {submission.uploaded_files.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => downloadSubmissionFiles(submission)}
                              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <Archive className="w-4 h-4" />
                              <span>Download All Files ({submission.uploaded_files.length})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage?.url || ''}
        fileName={selectedImage?.fileName || ''}
        onClose={() => setSelectedImage(null)}
      />
    </>
  )
}