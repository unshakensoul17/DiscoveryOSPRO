import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { Claim, Evidence, Discovery, ApiResponse, ClaimDetail } from '../types'

// Claims queries
export function useClaimsQuery(workspaceId: string, filters?: any) {
  return useQuery({
    queryKey: ['claims', workspaceId, filters],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 50, offset: 0 }
      if (filters?.status) params.status = filters.status
      if (filters?.type) params.type = filters.type
      if (filters?.staleness) params.staleness = filters.staleness
      if (filters?.search) params.search = filters.search
      if (filters?.confidence_min !== undefined && filters?.confidence_min !== null) {
        params.confidence_min = filters.confidence_min
      }
      if (filters?.confidenceRange && Array.isArray(filters.confidenceRange)) {
        params.confidence_min = filters.confidenceRange[0]
        params.confidence_max = filters.confidenceRange[1]
      }

      const { data } = await apiClient.get<ApiResponse<Claim[]>>(
        `/workspaces/${workspaceId}/claims`,
        { params }
      )
      return data.data
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useClaimDetail(workspaceId: string, claimId: string) {
  return useQuery({
    queryKey: ['claim', workspaceId, claimId],
    queryFn: async () => {
      const { data } = await apiClient.get<ClaimDetail>(`/workspaces/${workspaceId}/claims/${claimId}`)
      return data
    },
    enabled: !!claimId && !!workspaceId,
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useCreateClaim(workspaceId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (claim: any) => {
      const { data } = await apiClient.post(
        `/workspaces/${workspaceId}/claims`,
        claim
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['discoveries', workspaceId] })
    },
  })
}

// Evidence queries
export function useEvidenceQuery(workspaceId: string, claimId: string) {
  return useQuery({
    queryKey: ['evidence', workspaceId, claimId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Evidence[]>>(
        `/workspaces/${workspaceId}/claims/${claimId}/evidence`
      )
      return data.data
    },
    enabled: !!claimId && !!workspaceId,
  })
}

// Discoveries queries
export function useDiscoveriesQuery(workspaceId: string, filters?: any) {
  return useQuery({
    queryKey: ['discoveries', workspaceId, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Discovery[]>>(
        `/workspaces/${workspaceId}/discoveries`,
        { params: { ...filters, limit: 50, offset: 0 } }
      )
      return data.data
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useDismissDiscovery(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (discoveryId: string) => {
      const { data } = await apiClient.patch(`/workspaces/${workspaceId}/discoveries/${discoveryId}/dismiss`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discoveries', workspaceId] })
    },
  })
}

export function useResolveDiscovery(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (discoveryId: string) => {
      const { data } = await apiClient.patch(`/workspaces/${workspaceId}/discoveries/${discoveryId}/resolve`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discoveries', workspaceId] })
    },
  })
}

// Claim Investigation History
export function useClaimHistory(workspaceId: string, claimId: string) {
  return useQuery({
    queryKey: ['claim-history', workspaceId, claimId],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/workspaces/${workspaceId}/claims/${claimId}/history`)
      return data.data
    },
    enabled: !!workspaceId && !!claimId,
  })
}