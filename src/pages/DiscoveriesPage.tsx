import { useParams } from 'react-router-dom'
import { useDiscoveriesQuery } from '../api/hooks'
import { useUIStore } from '../store/ui'
import DiscoveryCard from '../components/Discoveries/DiscoveryCard'
import DiscoveryDetail from '../components/Discoveries/DiscoveryDetail'

export default function DiscoveriesPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { selectedDiscoveryId, setSelectedDiscoveryId } = useUIStore()
  const discoveriesQuery = useDiscoveriesQuery(workspaceId!)
  
  if (!workspaceId) return <div className="text-slate-400 font-mono p-6">Invalid workspace parameter</div>
  
  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 overflow-hidden">
      {/* List */}
      <div className="w-80 border-r border-white/10 overflow-y-auto p-6 flex-shrink-0 bg-[var(--background)] custom-scrollbar">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Validation Insights</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase mt-1 tracking-wider">Contradictions & Risks</p>
        </div>
        
        <div className="space-y-4">
          {discoveriesQuery.isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 glass-strong rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            discoveriesQuery.data?.map((discovery) => (
              <DiscoveryCard
                key={discovery.id}
                discovery={discovery}
                onSelect={setSelectedDiscoveryId}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--background)] custom-scrollbar">
        {selectedDiscoveryId ? (
          <DiscoveryDetail discoveryId={selectedDiscoveryId} />
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-white/10 rounded-2xl glass-strong">
            <span className="text-3xl mb-3 text-muted-foreground">🛡️</span>
            <h3 className="text-sm font-semibold text-foreground">No Insight Selected</h3>
            <p className="text-muted-foreground text-xs font-light mt-2 max-w-[200px]">
              Select a risk or contradiction from the list to audit its source.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}