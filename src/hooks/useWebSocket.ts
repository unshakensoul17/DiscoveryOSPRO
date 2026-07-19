import { useEffect } from 'react'
import { useRealtimeStore } from '../store/realtime'
import { useAuthStore } from '../store/auth'

export function useWebSocket(workspaceId: string) {
  const { tokens } = useAuthStore()
  const realtimeStore = useRealtimeStore()
  
  useEffect(() => {
    if (!tokens || !workspaceId) return
    
    realtimeStore.connect(workspaceId, tokens.access_token)
    
    return () => {
      realtimeStore.disconnect()
    }
  }, [workspaceId, tokens, realtimeStore])
  
  return realtimeStore
}