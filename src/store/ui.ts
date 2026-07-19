import { create } from 'zustand'

export interface ClaimsFilter {
  status?: 'active' | 'archived' | null
  type?: string | null
  confidenceRange?: [number, number]
  staleness?: 'fresh' | 'aging' | 'stale' | null
}

interface UIStore {
  // Navigation
  activeNav: 'dashboard' | 'claims' | 'discoveries' | 'research' | 'assumptions' | 'documents' | 'settings'
  sidebarOpen: boolean
  
  // Filters
  claimsFilters: ClaimsFilter
  evidenceFilters: any
  discoveriesFilters: any
  
  // Modals
  uploadModalOpen: boolean
  createClaimModalOpen: boolean
  createWorkspaceModalOpen: boolean
  
  // Selection
  selectedClaimId: string | null
  selectedDiscoveryId: string | null
  selectedResearchId: string | null
  
  // Actions
  setActiveNav: (nav: string) => void
  toggleSidebar: () => void
  openUploadModal: () => void
  closeUploadModal: () => void
  setSelectedClaimId: (id: string | null) => void
  setSelectedDiscoveryId: (id: string | null) => void
  setSelectedResearchId: (id: string | null) => void
  setClaimsFilters: (filters: Partial<ClaimsFilter>) => void
  openCreateClaimModal: () => void
  closeCreateClaimModal: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeNav: 'dashboard',
  sidebarOpen: true,
  claimsFilters: { status: 'active', type: null, confidenceRange: [0, 1] },
  evidenceFilters: {},
  discoveriesFilters: {},
  uploadModalOpen: false,
  createClaimModalOpen: false,
  createWorkspaceModalOpen: false,
  selectedClaimId: null,
  selectedDiscoveryId: null,
  selectedResearchId: null,
  
  setActiveNav: (nav) => set({ activeNav: nav as any }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openUploadModal: () => set({ uploadModalOpen: true }),
  closeUploadModal: () => set({ uploadModalOpen: false }),
  setSelectedClaimId: (id) => set({ selectedClaimId: id }),
  setSelectedDiscoveryId: (id) => set({ selectedDiscoveryId: id }),
  setSelectedResearchId: (id) => set({ selectedResearchId: id }),
  setClaimsFilters: (filters) =>
    set((state) => ({
      claimsFilters: { ...state.claimsFilters, ...filters },
    })),
  openCreateClaimModal: () => set({ createClaimModalOpen: true }),
  closeCreateClaimModal: () => set({ createClaimModalOpen: false }),
}))