import React from 'react'
import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../../store/workspace'
import { useUIStore } from '../../store/ui'

export default function Sidebar() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { workspaces, selectWorkspace } = useWorkspaceStore()
  const { sidebarOpen } = useUIStore()

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    selectWorkspace(id)
    navigate(`/workspaces/${id}/dashboard`)
  }

  const navItems = [
    { name: 'Discovery Feed', path: `/workspaces/${workspaceId}/dashboard`, icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )},
    { name: 'Pain Points & Hypotheses', path: `/workspaces/${workspaceId}/claims`, icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )},
    { name: 'Validation Insights & Campaigns', path: `/workspaces/${workspaceId}/discoveries`, icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )},
    { name: 'Ingestion & Pipelines', path: `/workspaces/${workspaceId}/ingest`, icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    )},
  ]

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-slate-700 p-4">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-[#E2E8F0] overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg shadow-blue-500/20">
          D
        </div>
        {sidebarOpen && (
          <span className="text-lg font-bold tracking-tight text-slate-900 animate-fade-in whitespace-nowrap">
            Discovery<span className="text-blue-400">OS</span>
          </span>
        )}
      </div>

      {/* Workspace Switcher */}
      {sidebarOpen && workspaces.length > 0 && (
        <div className="mb-4 px-2 animate-fade-in">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 font-mono">
            Environment
          </label>
          <select
            value={workspaceId || ''}
            onChange={handleWorkspaceChange}
            className="w-full bg-[#F1F5F9] border border-[#CBD5E1] hover:border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-colors cursor-pointer"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-100 text-slate-900 border border-[#E2E8F0]/50 shadow-inner'
                  : 'text-slate-400 hover:bg-[#F1F5F9] hover:text-slate-800'
              }`
            }
            title={!sidebarOpen ? item.name : undefined}
          >
            {({ isActive }) => (
              <>
                {/* Active left cyan accent line */}
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-blue-400 rounded-r-md" />
                )}
                <span className={`transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-800'}`}>
                  {item.icon}
                </span>
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      {/* Sidebar Footer */}
      {sidebarOpen && (
        <div className="px-2 py-4 border-t border-[#E2E8F0] text-center">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Discovery Intel v1.0
          </div>
        </div>
      )}
    </div>
  )
}
