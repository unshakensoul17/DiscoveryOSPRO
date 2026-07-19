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
      <div className="w-80 border-r border-[#E2E8F0] overflow-y-auto p-6 flex-shrink-0 bg-[#FFFFFF]/10">
        <div className="mb-6">
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Validation Insights</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Contradictions & Risks</p>
        </div>
        
        <div className="space-y-4">
          {discoveriesQuery.isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl animate-pulse" />
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
      <div className="flex-1 overflow-y-auto p-6 bg-[#F9F9FB]">
        {selectedDiscoveryId ? (
          <DiscoveryDetail discoveryId={selectedDiscoveryId} />
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 border border-dashed border-[#E2E8F0] rounded-xl bg-slate-50">
            <span className="text-2xl mb-2 text-slate-500">🛡️</span>
            <h3 className="text-sm font-semibold text-slate-600">No Insight Selected</h3>
            <p className="text-slate-500 text-xs font-light mt-1 max-w-[200px]">
              Select a risk or contradiction from the list to audit its source.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}