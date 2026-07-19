import { create } from 'zustand'
import { Workspace } from '../types'

interface WorkspaceStore {
  selectedWorkspaceId: string | null
  workspaces: Workspace[]
  
  selectWorkspace: (id: string) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void
  addWorkspace: (workspace: Workspace) => void
  removeWorkspace: (id: string) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  selectedWorkspaceId: null,
  workspaces: [],
  
  selectWorkspace: (id) => set({ selectedWorkspaceId: id }),
  
  setWorkspaces: (workspaces) => set({ workspaces }),
  
  updateWorkspace: (id, updates) =>
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === id ? { ...ws, ...updates } : ws
      ),
    })),
  
  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    })),
  
  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((ws) => ws.id !== id),
    })),
}))