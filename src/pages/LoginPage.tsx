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
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow orbs */}
      <div className="absolute -top-48 -left-24 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,26,26,0.18),transparent_60%)] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(120,0,0,0.28),transparent_60%)] blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass rounded-2xl p-8 z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.08)] px-3 py-1 text-xs font-medium text-[var(--primary)] mb-4">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
            Scientific Logic Engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Discovery<span className="bg-[var(--gradient-red)] bg-clip-text text-transparent text-glow">OS</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-light">
            Know what you know. Expose what you're missing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 glass-strong rounded-xl text-foreground placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[rgba(255,26,26,0.5)] transition-colors text-sm"
              required
              disabled={isLoading}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 glass-strong rounded-xl text-foreground placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[rgba(255,26,26,0.5)] transition-colors text-sm"
              required
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-[rgba(255,26,26,0.1)] border border-[rgba(255,26,26,0.35)] text-[var(--primary)] text-xs rounded-xl font-light leading-relaxed">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[var(--gradient-red)] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-transform red-glow hover:scale-[1.01] active:scale-[0.98]"
            >
              {isLoading ? 'Decrypting...' : 'Log in'}
            </button>
          </div>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-4 text-muted-foreground text-xs font-mono uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleDemoMode}
            disabled={isLoading}
            className="w-full py-2.5 px-4 glass-strong hover:bg-white/10 text-foreground font-semibold rounded-xl text-sm transition-all active:scale-[0.98]"
          >
            Launch Demo Workspace
          </button>
        </div>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
          <p className="text-muted-foreground text-xs font-light">
            Targeting production deployment?{' '}
            <span className="text-[var(--primary)] hover:underline font-medium cursor-pointer">
              Register Credentials
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
