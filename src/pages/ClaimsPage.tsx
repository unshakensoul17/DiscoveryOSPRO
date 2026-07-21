import { useParams } from 'react-router-dom'
import { useClaimsQuery } from '../api/hooks'
import { useUIStore } from '../store/ui'
import ClaimsList from '../components/Claims/ClaimsList'
import ClaimDetail from '../components/Claims/ClaimDetail'
import ClaimsFilter from '../components/Claims/ClaimsFilter'
import { Plus } from 'lucide-react'

export default function ClaimsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { claimsFilters, selectedClaimId, setSelectedClaimId, openCreateClaimModal } = useUIStore()
  const claimsQuery = useClaimsQuery(workspaceId!, claimsFilters)
  
  if (!workspaceId) return <div className="text-muted-foreground font-mono p-6">Invalid workspace parameter</div>
  
  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden gap-4">
      {/* Filters sidebar */}
      <div className="w-64 glass rounded-2xl p-5 overflow-y-auto flex-shrink-0">
        <ClaimsFilter />
      </div>
      
      {/* List and detail */}
      <div className="flex-1 flex overflow-hidden min-w-0 gap-4">
        {/* List */}
        <div className="w-80 glass rounded-2xl overflow-y-auto p-5 flex-shrink-0">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Hypothesis Explorer</h2>
              <p className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">Pain Points & Insights Catalog</p>
            </div>
            <button
              onClick={openCreateClaimModal}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--gradient-red)] px-3 py-1.5 text-xs font-semibold text-white red-glow transition-transform hover:scale-[1.02]"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          
          <ClaimsList
            claims={claimsQuery.data || []}
            isLoading={claimsQuery.isLoading}
            onSelectClaim={setSelectedClaimId}
          />
        </div>
        
        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedClaimId ? (
            <ClaimDetail claimId={selectedClaimId} />
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 glass rounded-2xl border border-dashed border-white/10">
              <span className="text-3xl mb-3">📖</span>
              <h3 className="text-sm font-semibold">No Hypothesis Selected</h3>
              <p className="text-muted-foreground text-xs font-light mt-1 max-w-[200px]">
                Select a hypothesis to audit its evidence strength and segment context.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}