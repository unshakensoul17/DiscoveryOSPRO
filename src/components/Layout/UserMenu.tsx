import { useState } from 'react'
import { useAuthStore } from '../../store/auth'

export default function UserMenu() {
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 focus:outline-none hover:bg-[#F1F5F9] p-1.5 rounded-lg border border-transparent hover:border-[#E2E8F0]/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/10">
          {user.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <span className="text-sm font-medium text-slate-700 hidden sm:inline">
          {user.name || user.email}
        </span>
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in">
          <div className="px-4 py-2.5 border-b border-[#E2E8F0]/60">
            <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Signed in as</p>
            <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{user.email}</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
