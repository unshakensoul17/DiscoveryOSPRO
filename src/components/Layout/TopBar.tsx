import { useParams } from 'react-router-dom'
import { useWorkspaceStore } from '../../store/workspace'

export default function TopBar() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { workspaces } = useWorkspaceStore()
  const currentWorkspace = workspaces.find((ws) => ws.id === workspaceId)

  return (
    <div className="flex items-center gap-4 font-mono">
      {currentWorkspace && (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-[#F1F5F9]/60 border border-[#CBD5E1]/60 px-3 py-1.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 shadow-sm shadow-emerald-400/50 animate-pulse" />
          <span className="text-slate-700">{currentWorkspace.name}</span>
        </div>
      )}
    </div>
  )
}
