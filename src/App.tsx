import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useAuthStore } from './store/auth'

import LoginPage from './pages/LoginPage'
import WorkspacesPage from './pages/WorkspacesPage'
import DashboardPage from './pages/DashboardPage'
import ClaimsPage from './pages/ClaimsPage'
import DiscoveriesPage from './pages/DiscoveriesPage'
import IngestionPage from './pages/IngestionPage'
import KnowledgeGraphPage from './pages/KnowledgeGraphPage'
import AppLayout from './components/Layout/AppLayout'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  useEffect(() => {
    const tokens = localStorage.getItem('tokens')
    if (tokens) { /* validate on mount */ }
  }, [])
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/workspaces" element={<ProtectedRoute><WorkspacesPage /></ProtectedRoute>} />
          
          <Route path="/workspaces/:workspaceId/dashboard" element={
            <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
          } />
          
          <Route path="/workspaces/:workspaceId/claims" element={
            <ProtectedRoute><AppLayout><ClaimsPage /></AppLayout></ProtectedRoute>
          } />
          
          <Route path="/workspaces/:workspaceId/discoveries" element={
            <ProtectedRoute><AppLayout><DiscoveriesPage /></AppLayout></ProtectedRoute>
          } />
          
          <Route path="/workspaces/:workspaceId/ingest" element={
            <ProtectedRoute><AppLayout><IngestionPage /></AppLayout></ProtectedRoute>
          } />

          <Route path="/workspaces/:workspaceId/graph" element={
            <ProtectedRoute><AppLayout><KnowledgeGraphPage /></AppLayout></ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/workspaces" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}