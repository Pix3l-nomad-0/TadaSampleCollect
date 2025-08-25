import React, { useState, useEffect } from 'react'
import { supabase, Form, FormField, uploadFile } from '../lib/supabase'
import { FileUpload } from './FileUpload'
import { CheckCircle, AlertCircle, FileText, Image as ImageIcon, Info } from 'lucide-react'

interface PublicFormProps {
  formId: string
}

export const PublicForm: React.FC<PublicFormProps> = ({ formId }) => {
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [userEmail, setUserEmail] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadForm()
  }, [formId])

  const loadForm = async () => {
    try {
      const [formResponse, fieldsResponse] = await Promise.all([
        supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .eq('active', true)
          .maybeSingle(),
        supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formId)
          .order('order_index')
      ])

      if (formResponse.error) throw formResponse.error
      if (!formResponse.data) {
        throw new Error('Form not found or inactive')
      }
      
      if (fieldsResponse.error) throw fieldsResponse.error

      setForm(formResponse.data)
      setFields(fieldsResponse.data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validate user email
    if (!userEmail.trim()) {
      errors.userEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      errors.userEmail = 'Please enter a valid email address'
    }

    // Validate required fields
    fields.forEach(field => {
      if (field.required && !formData[field.field_key]?.trim()) {
        errors[field.field_key] = `${field.field_name} is required`
      }
    })

    // Validate file requirements
    if (form && uploadedFiles.length > form.max_file_count) {
      errors.files = `Maximum ${form.max_file_count} files allowed`
    }

    uploadedFiles.forEach((file, index) => {
      if (file.size > (form?.max_file_size || 10) * 1024 * 1024) {
        errors.files = `File "${file.name}" exceeds ${form?.max_file_size}MB limit`
      }

      const isAllowedType = form?.allowed_file_types.some(allowedType => 
        file.type.match(allowedType.replace('*', '.*'))
      )

      if (!isAllowedType) {
        errors.files = `File "${file.name}" type not allowed`
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Upload files
      const fileUrls: string[] = []
      
      // Generate a unique submission ID
      const submissionId = crypto.randomUUID()
      
      // Create a clean email folder name
      const cleanEmail = userEmail.replace(/[^a-zA-Z0-9@.-]/g, '_').toLowerCase()
      
      for (const file of uploadedFiles) {
        const fileName = file.name
        // Create a clean folder name from form name
        const cleanFormName = form.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        const path = `${cleanFormName}_${formId.slice(0, 8)}/${cleanEmail}/${submissionId}/${fileName}`
        
        const fileUrl = await uploadFile(file, path, 'forms')
        fileUrls.push(fileUrl)
      }

      // Submit form data
      const { error: submitError } = await supabase
        .from('form_submissions')
        .insert({
          id: submissionId,
          form_id: formId,
          submitted_data: formData,
          uploaded_files: fileUrls,
          user_email: userEmail
        })

      if (submitError) throw submitError

      setSubmitted(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFieldChange = (fieldKey: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }))
    
    // Clear validation error for this field
    if (validationErrors[fieldKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldKey]
        return newErrors
      })
    }
  }

  const handleEmailChange = (value: string) => {
    setUserEmail(value)
    
    // Clear validation error for email
    if (validationErrors.userEmail) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.userEmail
        return newErrors
      })
    }
  }
  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files)
    
    // Clear file validation errors
    if (validationErrors.files) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.files
        return newErrors
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Form Not Available</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Successful!</h2>
          <p className="text-gray-600">Thank you for your submission. It has been received and will be reviewed.</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm">
          {/* Header */}
          <div className="p-8 border-b">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
                {form.description && (
                  <p className="text-gray-600 mt-1">{form.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Guidelines */}
          {form.guidelines && (
            <div className="p-8 border-b bg-blue-50">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Guidelines</h3>
                  <div 
                    className="prose prose-sm prose-blue max-w-none text-blue-800"
                    dangerouslySetInnerHTML={{ __html: form.guidelines }}
                  />
                  
                  {form.example_images.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-blue-900 mb-2">Examples:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {form.example_images.map((imageUrl, index) => (
                          <img
                            key={index}
                            src={imageUrl}
                            alt={`Example ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-6">
              {/* User Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Ta-da Email Address
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    validationErrors.userEmail
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                />
                {validationErrors.userEmail && (
                  <p className="mt-1 text-sm text-red-600">
                    {validationErrors.userEmail}
                  </p>
                )}
              </div>

              {/* Form Fields */}
              {fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.field_name}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.field_type === 'text' ? (
                    <input
                      type="text"
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                      className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        validationErrors[field.field_key]
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder={`Enter ${field.field_name.toLowerCase()}`}
                    />
                  ) : (
                    <select
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                      className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        validationErrors[field.field_key]
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select {field.field_name.toLowerCase()}</option>
                      {field.field_options.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {validationErrors[field.field_key] && (
                    <p className="mt-1 text-sm text-red-600">
                      {validationErrors[field.field_key]}
                    </p>
                  )}
                </div>
              ))}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Files
                  {form.max_file_count > 0 && (
                    <span className="text-gray-500 font-normal">
                      (Max {form.max_file_count} file{form.max_file_count !== 1 ? 's' : ''}, {form.max_file_size}MB each)
                    </span>
                  )}
                </label>
                
                <FileUpload
                  files={uploadedFiles}
                  onChange={handleFilesChange}
                  maxFiles={form.max_file_count}
                  maxFileSize={form.max_file_size}
                  allowedTypes={form.allowed_file_types}
                  error={validationErrors.files}
                />
                
                {validationErrors.files && (
                  <p className="mt-2 text-sm text-red-600">
                    {validationErrors.files}
                  </p>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  Allowed types: {form.allowed_file_types.map(type => 
                    type === 'image/*' ? 'Images' : 'Audio'
                  ).join(', ')}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 pt-6 border-t">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Form'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}