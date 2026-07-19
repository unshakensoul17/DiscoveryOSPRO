import { useParams } from 'react-router-dom'
import { useClaimsQuery } from '../api/hooks'
import { useUIStore } from '../store/ui'
import ClaimsList from '../components/Claims/ClaimsList'
import ClaimDetail from '../components/Claims/ClaimDetail'
import ClaimsFilter from '../components/Claims/ClaimsFilter'

export default function ClaimsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { claimsFilters, selectedClaimId, setSelectedClaimId, openCreateClaimModal } = useUIStore()
  const claimsQuery = useClaimsQuery(workspaceId!, claimsFilters)
  
  if (!workspaceId) return <div className="text-slate-400 font-mono p-6">Invalid workspace parameter</div>
  
  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 overflow-hidden">
      {/* Filters sidebar */}
      <div className="w-72 border-r border-[#E2E8F0] bg-[#FFFFFF] p-6 overflow-y-auto flex-shrink-0">
        <ClaimsFilter />
      </div>
      
      {/* List and detail */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* List */}
        <div className="w-80 border-r border-[#E2E8F0] overflow-y-auto p-6 flex-shrink-0">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Hypothesis Explorer</h2>
              <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Pain Points & Insights Catalog</p>
            </div>
            <button
              onClick={openCreateClaimModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/10 transition-colors"
            >
              ＋ Add Hypothesis
            </button>
          </div>
          
          <ClaimsList
            claims={claimsQuery.data || []}
            isLoading={claimsQuery.isLoading}
            onSelectClaim={setSelectedClaimId}
          />
        </div>
        
        {/* Detail */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F9F9FB]">
          {selectedClaimId ? (
            <ClaimDetail claimId={selectedClaimId} />
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 border border-dashed border-[#E2E8F0] rounded-xl bg-slate-50">
              <span className="text-2xl mb-2 text-slate-500">📖</span>
              <h3 className="text-sm font-semibold text-slate-700">No Hypothesis Selected</h3>
              <p className="text-slate-500 text-xs font-light mt-1 max-w-[200px]">
                Select a hypothesis to audit its evidence strength and segment context.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}