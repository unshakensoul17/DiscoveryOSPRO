import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { Claim, Evidence, Discovery, ApiResponse } from '../types'

// Claims queries
export function useClaimsQuery(workspaceId: string, filters?: any) {
  return useQuery({
    queryKey: ['claims', workspaceId, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Claim[]>>(
        `/workspaces/${workspaceId}/claims`,
        { params: { ...filters, limit: 50, offset: 0 } }
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
      const { data } = await apiClient.get(`/workspaces/${workspaceId}/claims/${claimId}`)
      return data
    },
    enabled: !!claimId && !!workspaceId,
    staleTime: 1000 * 60,
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

export function useCreateEvidence(workspaceId: string, claimId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (evidence: any) => {
      const { data } = await apiClient.post(
        `/workspaces/${workspaceId}/claims/${claimId}/evidence`,
        evidence
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', workspaceId, claimId] })
      queryClient.invalidateQueries({ queryKey: ['claim', workspaceId, claimId] })
    },
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
    staleTime: 1000 * 60 * 2,
  })
}


