import React, { useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { useWorkspaceStore } from '../../store/workspace'
import { apiClient } from '../../api/client'
import { Sidebar } from '../dashboard/Sidebar'
import { TopNav } from '../dashboard/TopNav'
import UploadModal from '../Modals/UploadModal'
import CreateClaimModal from '../Modals/CreateClaimModal'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuthStore()
  const { workspaces, setWorkspaces } = useWorkspaceStore()
  
  useEffect(() => {
    if (user && workspaces.length === 0) {
      apiClient.get<any>('/workspaces')
        .then(({ data }) => {
          const list = Array.isArray(data) ? data : (data.data || [])
          setWorkspaces(list)
        })
        .catch((err) => {
          console.warn('AppLayout workspace fetch failed', err)
          // Fallback just like WorkspacesPage if backend is down
          setWorkspaces([{
            id: 'ws-1', name: 'Test Workspace', description: 'Primary', created_by: 'u-1',
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            member_count: 5, role: 'admin', config: {}
          }])
        })
    }
  }, [user, workspaces.length, setWorkspaces])

  if (!user) {
    return null
  }
  
  return (
    <div className="min-h-screen p-4 lg:p-6 bg-[var(--background)] text-[var(--foreground)] font-sans">
      <div className="mx-auto flex max-w-[1500px] gap-6">
        <Sidebar />

        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <TopNav />
          
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>

      {/* Global Application Modals */}
      <UploadModal />
      <CreateClaimModal />
    </div>
  )
}