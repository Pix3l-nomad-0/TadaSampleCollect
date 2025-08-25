import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { AdminPanel } from './components/AdminPanel'
import { PublicForm } from './components/PublicForm'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [formId, setFormId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if this is a public form access
    const urlParams = new URLSearchParams(window.location.search)
    const formIdParam = urlParams.get('form')
    
    if (formIdParam) {
      setFormId(formIdParam)
      setIsAuthenticated(false)
      setLoading(false)
      return
    }

    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated)
  }

  const handleSignOut = () => {
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  // Public form access
  if (formId) {
    return <PublicForm formId={formId} />
  }

  // Admin interface
  if (isAuthenticated) {
    return <AdminPanel onSignOut={handleSignOut} />
  }

  // Authentication required
  return <Auth onAuthChange={handleAuthChange} />
}

export default App