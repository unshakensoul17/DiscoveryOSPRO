import React from 'react'
import { useAuthStore } from '../../store/auth'
import { Sidebar } from '../dashboard/Sidebar'
import { TopNav } from '../dashboard/TopNav'
import UploadModal from '../Modals/UploadModal'
import CreateClaimModal from '../Modals/CreateClaimModal'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuthStore()
  
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