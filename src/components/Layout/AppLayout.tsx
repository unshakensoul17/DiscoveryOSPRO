import React from 'react'
import { useUIStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import UserMenu from './UserMenu'
import UploadModal from '../Modals/UploadModal'
import CreateClaimModal from '../Modals/CreateClaimModal'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user } = useAuthStore()
  
  if (!user) {
    return null
  }
  
  return (
    <div className="flex h-screen bg-[#F9F9FB] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out bg-[#FFFFFF] border-r border-[#E2E8F0] flex-shrink-0`}>
        <Sidebar />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="h-16 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between px-6 flex-shrink-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-[#E2E8F0] hover:border-slate-300 bg-slate-950/40 text-slate-400 hover:text-slate-900 focus:outline-none"
              aria-label="Toggle sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M4 6h16M4 12h12m-12 6h8" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
            <TopBar />
          </div>
          
          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </div>
        
        {/* Page scroll content */}
        <div className="flex-1 overflow-auto bg-[#F9F9FB] p-6 relative">
          {children}
        </div>
      </div>

      {/* Global Application Modals */}
      <UploadModal />
      <CreateClaimModal />
    </div>
  )
}