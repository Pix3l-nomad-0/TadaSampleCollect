import React, { useState, useEffect } from 'react'
import { supabase, Form, FormField, FormSubmission, getFileUrl } from '../lib/supabase'
import { ArrowLeft, Download, Calendar, User, FileText, Image, Volume2, ExternalLink } from 'lucide-react'

interface FormSubmissionsProps {
  formId: string
  onBack: () => void
}

export const FormSubmissions: React.FC<FormSubmissionsProps> = ({ formId, onBack }) => {
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)

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
    <div className="space-y-6">
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
            <h2 className="text-2xl font-bold text-gray-900">{form.name} Submissions</h2>
            <p className="text-gray-600">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        
        {submissions.length > 0 && (
          <button
            onClick={exportSubmissions}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
          <p className="text-gray-600">Submissions will appear here once users start filling out your form.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="bg-white border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(submission.created_at).toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">ID: {submission.id.slice(0, 8)}</div>
                  {submission.user_email && (
                    <div className="text-xs text-blue-600 mt-1">{submission.user_email}</div>
                  )}
                </div>
              </div>

              {fields.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Form Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map((field) => (
                      <div key={field.id} className="bg-gray-50 p-3 rounded-lg">
                        <dt className="text-sm font-medium text-gray-700">{field.field_name}</dt>
                        <dd className="text-sm text-gray-900 mt-1">
                          {submission.submitted_data[field.field_key] || '-'}
                        </dd>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {submission.uploaded_files.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Uploaded Files ({submission.uploaded_files.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {submission.uploaded_files.map((fileUrl, index) => {
                      const fileType = getFileType(fileUrl)
                      const fileName = getFileName(fileUrl)
                      
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-2 mb-2">
                            {fileType === 'image' ? (
                              <Image className="w-4 h-4 text-blue-600" />
                            ) : fileType === 'audio' ? (
                              <Volume2 className="w-4 h-4 text-purple-600" />
                            ) : (
                              <FileText className="w-4 h-4 text-gray-600" />
                            )}
                            <span className="text-xs text-gray-600 truncate flex-1">
                              {fileName}
                            </span>
                          </div>
                          
                          {fileType === 'image' && (
                            <img
                              src={fileUrl}
                              alt={fileName}
                              className="w-full h-20 object-cover rounded mb-2"
                              loading="lazy"
                            />
                          )}
                          
                          {fileType === 'audio' && (
                            <audio
                              src={fileUrl}
                              controls
                              className="w-full h-8 mb-2"
                              style={{ height: '32px' }}
                            />
                          )}
                          
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center space-x-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}