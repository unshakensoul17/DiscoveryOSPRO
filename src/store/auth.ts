import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthTokens } from '../types'

interface AuthStore {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  
  setUser: (user: User | null) => void
  setTokens: (tokens: AuthTokens | null) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      
      setUser: (user) => set((state) => ({ user, isAuthenticated: !!user && !!state.tokens })),
      setTokens: (tokens) => set((state) => ({ tokens, isAuthenticated: !!state.user && !!tokens })),
      logout: () => set({ user: null, tokens: null, isAuthenticated: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'discoveryos-auth-storage',
    }
  )
)