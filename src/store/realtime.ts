import { create } from 'zustand'

interface RealtimeStore {
  isConnected: boolean
  subscriptions: Set<string>
  ws: WebSocket | null
  
  connect: (workspaceId: string, token: string) => void
  disconnect: () => void
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  isConnected: false,
  subscriptions: new Set(),
  ws: null,
  
  connect: (workspaceId, token) => {
    const url = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000/v1'}/ws?token=${token}&workspace_id=${workspaceId}`
    const ws = new WebSocket(url)
    
    ws.onopen = () => {
      set({ isConnected: true, ws })
    }
    
    ws.onclose = () => {
      set({ isConnected: false, ws: null })
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  },
  
  disconnect: () => {
    set((state) => {
      state.ws?.close()
      return { isConnected: false, ws: null, subscriptions: new Set() }
    })
  },
  
  subscribe: (channel) => {
    set((state) => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'subscribe', channel }))
      }
      return { subscriptions: new Set([...state.subscriptions, channel]) }
    })
  },
  
  unsubscribe: (channel) => {
    set((state) => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'unsubscribe', channel }))
      }
      const newSubs = new Set(state.subscriptions)
      newSubs.delete(channel)
      return { subscriptions: newSubs }
    })
  },
}))