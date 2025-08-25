import React, { useState, useEffect } from 'react'
import { supabase, Form } from '../lib/supabase'
import { Edit, BarChart3, ExternalLink, ToggleLeft, ToggleRight, Trash2, Copy, CheckCircle } from 'lucide-react'

interface FormListProps {
  onEditForm: (formId: string) => void
  onViewSubmissions: (formId: string) => void
}

export const FormList: React.FC<FormListProps> = ({ onEditForm, onViewSubmissions }) => {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadForms()
  }, [])

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setForms(data || [])
    } catch (error) {
      console.error('Error loading forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFormActive = async (formId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('forms')
        .update({ active })
        .eq('id', formId)

      if (error) throw error
      
      setForms(forms.map(form => 
        form.id === formId ? { ...form, active } : form
      ))
    } catch (error) {
      console.error('Error updating form status:', error)
    }
  }

  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This will also delete all submissions.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId)

      if (error) throw error
      setForms(forms.filter(form => form.id !== formId))
    } catch (error) {
      console.error('Error deleting form:', error)
    }
  }

  const copyFormLink = (formId: string) => {
    const link = `${window.location.origin}?form=${formId}`
    navigator.clipboard.writeText(link)
    setCopiedId(formId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading forms...</p>
        </div>
      </div>
    )
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-sm mx-auto">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Edit className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
          <p className="text-gray-600 mb-6">Create your first data collection form to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Your Forms</h2>
        <p className="text-gray-600">{forms.length} form{forms.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => (
          <div key={form.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{form.name}</h3>
                  {form.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">{form.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleFormActive(form.id, !form.active)}
                    className={`transition-colors ${
                      form.active ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {form.active ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  form.active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {form.active ? 'Active' : 'Inactive'}
                </span>
                <span>•</span>
                <span>Created {new Date(form.created_at).toLocaleDateString()}</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => copyFormLink(form.id)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {copiedId === form.id ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onEditForm(form.id)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  
                  <button
                    onClick={() => onViewSubmissions(form.id)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Submissions</span>
                  </button>
                  
                  <button
                    onClick={() => deleteForm(form.id)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}