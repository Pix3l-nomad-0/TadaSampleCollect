import React, { useState, useEffect } from 'react'
import { supabase, Form, FormField } from '../lib/supabase'
import { Plus, Trash2, Save, X, Settings, FileText, Image, AlertCircle } from 'lucide-react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

interface FormBuilderProps {
  formId?: string | null
  onSaved: () => void
  onCancel: () => void
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ formId, onSaved, onCancel }) => {
  const [form, setForm] = useState<Partial<Form>>({
    name: '',
    description: '',
    active: true,
    max_file_count: 5,
    max_file_size: 10,
    allowed_file_types: ['image/*', 'audio/*'],
    guidelines: '',
    example_images: []
  })
  const [fields, setFields] = useState<Partial<FormField>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'basic' | 'fields' | 'files' | 'guidelines'>('basic')

  // Quill editor configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  }

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent', 'link', 'image',
    'align', 'color', 'background'
  ]

  useEffect(() => {
    if (formId) {
      loadForm()
    }
  }, [formId])

  const loadForm = async () => {
    if (!formId) return

    setLoading(true)
    try {
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single()

      if (formError) throw formError

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index')

      if (fieldsError) throw fieldsError

      setForm(formData)
      setFields(fieldsData || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name?.trim()) {
      setError('Form name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let savedForm: Form

      if (formId) {
        // Update existing form
        const { data, error: formError } = await supabase
          .from('forms')
          .update({
            name: form.name,
            description: form.description,
            active: form.active,
            max_file_count: form.max_file_count,
            max_file_size: form.max_file_size,
            allowed_file_types: form.allowed_file_types,
            guidelines: form.guidelines,
            example_images: form.example_images,
            bucket_name: 'forms'
          })
          .eq('id', formId)
          .select()
          .single()

        if (formError) throw formError
        savedForm = data

        // Delete existing fields
        await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', formId)
      } else {
        // Create new form
        const { data, error: formError } = await supabase
          .from('forms')
          .insert({
            ...form,
            user_id: user.id,
            bucket_name: 'forms'
          } as any)
          .select()
          .single()

        if (formError) throw formError
        savedForm = data

        // Create form folder immediately
        try {
          const cleanFormName = form.name!.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase()
          const placeholderPath = `${cleanFormName}/.placeholder`
          
          // Create a placeholder file to ensure the folder exists
          const placeholderContent = new Blob([`This folder was created for form: ${form.name}\nCreated: ${new Date().toISOString()}`], { type: 'text/plain' })
          
          const { error: uploadError } = await supabase.storage
            .from('forms')
            .upload(placeholderPath, placeholderContent, {
              cacheControl: '3600',
              upsert: true
            })
          
          if (uploadError) {
            console.warn('Could not create form folder:', uploadError.message)
          } else {
            console.log(`Created folder for form: ${cleanFormName}`)
          }
        } catch (folderError) {
          // Don't fail the form creation if folder creation fails
        }
      }

      // Insert fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map((field, index) => ({
          ...field,
          form_id: savedForm.id,
          order_index: index,
          field_key: field.field_name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || ''
        }))

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert)

        if (fieldsError) throw fieldsError
      }

      onSaved()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addField = () => {
    setFields([...fields, {
      field_name: '',
      field_type: 'text',
      field_options: [],
      required: false
    }])
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const addExampleImage = () => {
    setForm({
      ...form,
      example_images: [...(form.example_images || []), '']
    })
  }

  const updateExampleImage = (index: number, url: string) => {
    const newImages = [...(form.example_images || [])]
    newImages[index] = url
    setForm({ ...form, example_images: newImages })
  }

  const removeExampleImage = (index: number) => {
    setForm({
      ...form,
      example_images: form.example_images?.filter((_, i) => i !== index) || []
    })
  }

  if (loading && formId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading form...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {formId ? 'Edit Form' : 'Create New Form'}
            </h2>
            <p className="text-gray-600 mt-1">
              Build your custom form with fields and file upload capabilities
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Form'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 m-6 rounded">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'basic', label: 'Basic Info', icon: FileText },
            { id: 'fields', label: 'Form Fields', icon: Settings },
            { id: 'files', label: 'File Upload', icon: Image },
            { id: 'guidelines', label: 'Guidelines', icon: FileText }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Name *
                </label>
                <input
                  type="text"
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter form name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={form.active ? 'active' : 'inactive'}
                  onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                placeholder="Describe what this form is for"
              />
            </div>
          </div>
        )}

        {/* Form Fields Tab */}
        {activeTab === 'fields' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Form Fields</h3>
              <button
                onClick={addField}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Field</span>
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={field.field_name || ''}
                        onChange={(e) => updateField(index, { field_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Field name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Field Type
                      </label>
                      <select
                        value={field.field_type || 'text'}
                        onChange={(e) => updateField(index, { field_type: e.target.value as 'text' | 'select' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="text">Text Input</option>
                        <option value="select">Select Dropdown</option>
                      </select>
                    </div>

                    <div className="flex items-end space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Required</span>
                      </label>
                      
                      <button
                        onClick={() => removeField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {field.field_type === 'select' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options (one per line)
                      </label>
                      <textarea
                        value={(field.field_options || []).join('\n')}
                        onChange={(e) => updateField(index, { field_options: e.target.value.split('\n').filter(Boolean) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </div>
                  )}
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No fields added yet. Click "Add Field" to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Upload Tab */}
        {activeTab === 'files' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">File Upload Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Files
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.max_file_count || 5}
                  onChange={(e) => setForm({ ...form, max_file_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum File Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.max_file_size || 10}
                  onChange={(e) => setForm({ ...form, max_file_size: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed File Types
              </label>
              <div className="space-y-2">
                {['image/*', 'audio/*', 'video/*'].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.allowed_file_types?.includes(type) || false}
                      onChange={(e) => {
                        const types = form.allowed_file_types || []
                        if (e.target.checked) {
                          setForm({ ...form, allowed_file_types: [...types, type] })
                        } else {
                          setForm({ ...form, allowed_file_types: types.filter(t => t !== type) })
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {type === 'image/*' ? 'Images (JPG, PNG, GIF, HEIC, etc.)' : 
                       type === 'audio/*' ? 'Audio files (MP3, WAV, etc.)' : 
                       'Video files (MP4, MOV, AVI, etc.)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Guidelines Tab */}
        {activeTab === 'guidelines' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Form Guidelines</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guidelines
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={form.guidelines || ''}
                  onChange={(value) => setForm({ ...form, guidelines: value })}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Write your form guidelines here. Use the toolbar above to format your text..."
                  style={{ minHeight: '200px' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use the toolbar to format your guidelines with headings, lists, links, and more.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Example Images
                </label>
                <button
                  onClick={addExampleImage}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Image</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {(form.example_images || []).map((url, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateExampleImage(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                    <button
                      onClick={() => removeExampleImage(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}