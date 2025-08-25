import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FormBuilder } from './FormBuilder'
import { FormList } from './FormList'
import { FormSubmissions } from './FormSubmissions'
import { Plus, List, BarChart3, LogOut, Settings } from 'lucide-react'

interface AdminPanelProps {
  onSignOut: () => void
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSignOut }) => {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'submissions'>('list')
  const [editingFormId, setEditingFormId] = useState<string | null>(null)
  const [viewingSubmissionsFormId, setViewingSubmissionsFormId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        
        setIsAdmin(profile?.is_admin || false)
        
        if (!profile?.is_admin) {
          await supabase.auth.signOut()
          onSignOut()
        }
      }
    }
    checkUserStatus()
  }, [])

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Verifying admin access...</p>
        </div>
      </div>
    )
  }
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onSignOut()
  }

  const handleEditForm = (formId: string) => {
    setEditingFormId(formId)
    setCurrentView('edit')
  }

  const handleViewSubmissions = (formId: string) => {
    setViewingSubmissionsFormId(formId)
    setCurrentView('submissions')
  }

  const handleBackToList = () => {
    setCurrentView('list')
    setEditingFormId(null)
    setViewingSubmissionsFormId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Collection</h1>
                <p className="text-sm text-gray-500">Admin Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('list')}
              className={`py-4 border-b-2 transition-colors ${
                currentView === 'list'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <List className="w-4 h-4" />
                <span>Forms</span>
              </div>
            </button>
            
            <button
              onClick={() => setCurrentView('create')}
              className={`py-4 border-b-2 transition-colors ${
                currentView === 'create' || currentView === 'edit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create Form</span>
              </div>
            </button>
            
            {currentView === 'submissions' && (
              <button className="py-4 border-b-2 border-blue-600 text-blue-600">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Submissions</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'list' && (
          <FormList
            onEditForm={handleEditForm}
            onViewSubmissions={handleViewSubmissions}
          />
        )}
        
        {(currentView === 'create' || currentView === 'edit') && (
          <FormBuilder
            formId={editingFormId}
            onSaved={handleBackToList}
            onCancel={handleBackToList}
          />
        )}
        
        {currentView === 'submissions' && viewingSubmissionsFormId && (
          <FormSubmissions
            formId={viewingSubmissionsFormId}
            onBack={handleBackToList}
          />
        )}
      </main>
    </div>
  )
}