import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Evidence } from '../types'

interface UseEvidenceSyncProps {
  claimId: string
  workspaceId: string
}

interface EvidenceSyncEvent {
  type: 'evidence_added' | 'evidence_updated' | 'evidence_deleted'
  evidence?: Evidence
  evidence_id?: string
  timestamp: string
}

export function useEvidenceSync({ claimId, workspaceId }: UseEvidenceSyncProps) {
  const queryClient = useQueryClient()

  const handleEvidenceEvent = useCallback(
    (event: EvidenceSyncEvent) => {
      if (event.type === 'evidence_added' && event.evidence) {
        // Add to cache
        queryClient.setQueryData(['evidence', workspaceId, claimId], (old: Evidence[] | undefined) => {
          if (!old) return [event.evidence]
          return [...old, event.evidence]
        })

        // Invalidate claim detail
        queryClient.invalidateQueries({
          queryKey: ['claim', workspaceId, claimId],
        })
      } else if (event.type === 'evidence_updated' && event.evidence) {
        // Update in cache
        queryClient.setQueryData(['evidence', workspaceId, claimId], (old: Evidence[] | undefined) => {
          if (!old) return [event.evidence]
          return old.map((e) => (e.id === event.evidence?.id ? event.evidence : e))
        })

        // Invalidate claim detail
        queryClient.invalidateQueries({
          queryKey: ['claim', workspaceId, claimId],
        })
      } else if (event.type === 'evidence_deleted' && event.evidence_id) {
        // Remove from cache
        queryClient.setQueryData(['evidence', workspaceId, claimId], (old: Evidence[] | undefined) => {
          if (!old) return []
          return old.filter((e) => e.id !== event.evidence_id)
        })

        // Invalidate claim detail
        queryClient.invalidateQueries({
          queryKey: ['claim', workspaceId, claimId],
        })
      }
    },
    [queryClient, workspaceId, claimId]
  )

  useEffect(() => {
    // Listen for evidence changes (would connect to WebSocket in real implementation)
    const handleMessage = (message: any) => {
      if (
        message.data?.claim_id === claimId &&
        ['evidence_added', 'evidence_updated', 'evidence_deleted'].includes(message.data?.type)
      ) {
        handleEvidenceEvent(message.data)
      }
    }

    window.addEventListener('evidence-sync', handleMessage)
    return () => window.removeEventListener('evidence-sync', handleMessage)
  }, [claimId, handleEvidenceEvent])

  return { handleEvidenceEvent }
}
