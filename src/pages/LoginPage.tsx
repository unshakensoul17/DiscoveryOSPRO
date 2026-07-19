import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { apiClient } from '../api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser, setTokens } = useAuthStore()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { data } = await apiClient.post<any>('/auth/login', formData)
      setTokens(data.tokens)
      setUser(data.user)
      navigate('/workspaces')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login credentials failed. Try launching in Demo Mode below.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoMode = () => {
    setIsLoading(true)
    // Seed auth store with mock credentials for demonstration
    setTimeout(() => {
      setUser({
        id: 'u-demo',
        email: 'researcher@discoveryos.io',
        name: 'Dr. Evelyn Vance',
        avatar_url: undefined,
        created_at: new Date().toISOString()
      })
      setTokens({
        access_token: 'demo-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 86400
      })
      localStorage.setItem('tokens', 'demo-tokens')
      navigate('/workspaces')
    }, 400)
  }

  return (
    <div className="min-h-screen bg-[#F9F9FB] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Refined Glowing Backdrops */}
      <div className="absolute top-[-25%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#FFFFFF]/80 backdrop-blur-xl border border-[#E2E8F0] rounded-2xl shadow-2xl p-8 z-10">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-500/20 text-blue-400 text-xs font-mono rounded-full mb-3 uppercase tracking-wider">
            Scientific Logic Engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Discovery<span className="text-blue-400">OS</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-light">
            Know what you know. Expose what you're missing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition-colors text-sm"
              required
              disabled={isLoading}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition-colors text-sm"
              required
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-400 text-xs rounded-lg font-light leading-relaxed">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-semibold rounded-lg text-sm transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.98]"
            >
              {isLoading ? 'Decrypting...' : 'Log in'}
            </button>
          </div>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-[#E2E8F0]"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-xs font-mono uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-[#E2E8F0]"></div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleDemoMode}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-100 border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-850 text-slate-800 font-semibold rounded-lg text-sm transition-all active:scale-[0.98]"
          >
            Launch Demo Workspace
          </button>
        </div>

        <div className="mt-8 text-center border-t border-[#E2E8F0]/60 pt-6">
          <p className="text-slate-500 text-xs font-light">
            Targeting production deployment?{' '}
            <span className="text-blue-400 hover:underline font-medium cursor-pointer">
              Register Credentials
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
