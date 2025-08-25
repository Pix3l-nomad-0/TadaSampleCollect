import React, { useState, useEffect } from 'react'
import { supabase, Form, FormField, FormSubmission, getFileUrl } from '../lib/supabase'
import { ArrowLeft, Download, Calendar, User, FileText, Image, Volume2, ExternalLink, X, ZoomIn, Grid } from 'lucide-react'
import { AuthenticatedImage } from './AuthenticatedImage'

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
          fileUrl={imageUrl}
          fileName={fileName}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
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

    const headers = ['Submission Date', 'User Email', ...fields.map(f => f.field_name), 'Uploaded Files']
    const rows = submissions.map(submission => [
      new Date(submission.created_at).toLocaleString(),
      submission.user_email || '',
      ...fields.map(field => submission.submitted_data[field.field_key] || ''),
      submission.uploaded_files.join(', ')
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_submissions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getFileType = (url: string) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image'
    if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) return 'audio'
    return 'unknown'
  }

  const getFileName = (url: string) => {
    return url.split('/').pop()?.split('?')[0] || 'file'
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
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {submission.id.slice(0, 8)}
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
                                {submission.submitted_data[field.field_key] || '-'}
                              </dd>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Images Grid - Prominent */}
                    {submission.uploaded_files.length > 0 && (
                      <div className="lg:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                          <Grid className="w-3 h-3 mr-1" />
                          Images ({submission.uploaded_files.filter(url => getFileType(url) === 'image').length})
                        </h4>
                        <div className="grid grid-cols-5 gap-2">
                          {submission.uploaded_files.map((fileUrl, index) => {
                            const fileType = getFileType(fileUrl)
                            const fileName = getFileName(fileUrl)
                            
                            if (fileType === 'image') {
                              return (
                                <div key={index} className="group relative aspect-square">
                                  <AuthenticatedImage
                                    fileUrl={fileUrl}
                                    fileName={fileName}
                                    className="w-full h-full object-cover rounded border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
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
                            } else if (fileType === 'audio') {
                              return (
                                <div key={index} className="aspect-square bg-purple-50 border border-purple-200 rounded flex flex-col items-center justify-center p-1">
                                  <Volume2 className="w-4 h-4 text-purple-600 mb-1" />
                                  <audio
                                    src={fileUrl}
                                    controls
                                    className="w-full h-4 text-xs"
                                    style={{ height: '16px', fontSize: '10px' }}
                                  />
                                </div>
                              )
                            } else {
                              return (
                                <div key={index} className="aspect-square bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center p-1">
                                  <FileText className="w-4 h-4 text-gray-600 mb-1" />
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center"
                                  >
                                    <ExternalLink className="w-2 h-2" />
                                  </a>
                                </div>
                              )
                            }
                          })}
                        </div>
                        
                        {/* Audio files separately if any */}
                        {submission.uploaded_files.some(url => getFileType(url) === 'audio') && (
                          <div className="mt-3">
                            <h5 className="text-xs font-medium text-gray-700 mb-2">Audio Files</h5>
                            <div className="space-y-1">
                              {submission.uploaded_files
                                .filter(url => getFileType(url) === 'audio')
                                .map((fileUrl, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <Volume2 className="w-3 h-3 text-purple-600" />
                                    <audio src={fileUrl} controls className="flex-1 h-6" />
                                  </div>
                                ))}
                            </div>
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