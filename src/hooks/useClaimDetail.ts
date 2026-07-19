import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import { ClaimDetail } from '../types'

interface UseClaimDetailProps {
  workspaceId: string
  claimId: string
  enabled?: boolean
}

export function useClaimDetail({ workspaceId, claimId, enabled = true }: UseClaimDetailProps) {
  return useQuery({
    queryKey: ['claim', workspaceId, claimId],
    queryFn: async () => {
      const response = await apiClient.get<ClaimDetail>(
        `/workspaces/${workspaceId}/claims/${claimId}`
      )
      return response.data
    },
    enabled: enabled && !!claimId && !!workspaceId,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}
