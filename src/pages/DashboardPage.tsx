import { useParams, useNavigate } from 'react-router-dom'
import { useClaimsQuery, useDiscoveriesQuery } from '../api/hooks'
import { useUIStore } from '../store/ui'

const DISC_ICONS: Record<string, string> = {
  contradiction:      '⚠️',
  belief_drift:       '📉',
  assumption_exposure:'🛡️',
  stale_evidence:     '🕰️',
  research_bias:      '🔍',
  unknown_unknown:    '❓',
}

function MetricCard({ label, value, sub, color = 'text-slate-900', note }: {
  label: string; value: string | number; sub?: string; color?: string; note?: string
}) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-lg flex flex-col justify-between h-28 hover:border-[#CBD5E1] transition-colors">
      <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-3xl font-extrabold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-400 border-t border-[#E2E8F0]/60 pt-1.5 mt-1">{sub}</div>}
      {note && <div className={`text-[9px] font-mono uppercase ${color} opacity-70`}>{note}</div>}
    </div>
  )
}

function Skeleton() {
  return <div className="h-20 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl animate-pulse" />
}

export default function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { openUploadModal, openCreateClaimModal } = useUIStore()
  const wsId = workspaceId || ''

  const { data: claims      = [], isLoading: loadingClaims }      = useClaimsQuery(wsId)
  const { data: discoveries = [], isLoading: loadingDiscoveries } = useDiscoveriesQuery(wsId)

  const loading = loadingClaims || loadingDiscoveries

  // Derived metrics from real data
  const avgConfidence     = claims.length
    ? Math.round((claims.reduce((a: number, c: any) => a + (c.confidence ?? 0), 0) / claims.length) * 100)
    : 0
  const activeDiscoveries  = discoveries.filter((d: any) => d.status === 'active')
  const criticalCount      = activeDiscoveries.filter((d: any) => d.severity > 0.75).length
  const staleCount         = claims.filter((c: any) => (c.staleness_score ?? 0) > 0.5).length

  const foundationalAlert  = activeDiscoveries.find((d: any) =>
    d.type === 'assumption_exposure' && d.severity >= 0.7
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Foundational Assumption Alert ── */}
      {foundationalAlert && (
        <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-[#FFFFFF] p-5 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="text-2xl flex-shrink-0">🚨</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-red-400 border border-red-800/60 bg-red-950/40 px-2 py-0.5 rounded">
                  Critical Insight Alert
                </span>
                <span className="text-[9px] font-mono text-red-500">
                  Risk Level {Math.round(foundationalAlert.severity * 100)}%
                </span>
              </div>
              <p className="text-sm font-semibold text-red-200 leading-snug">{foundationalAlert.description}</p>
              <p className="text-[11px] text-red-400/70 mt-1 font-light">
                Insight validation may be blocked by this unverified user assumption. Run validation to resolve the risk.
              </p>
            </div>
            <button
              onClick={() => navigate(`/workspaces/${wsId}/discoveries`)}
              className="flex-shrink-0 px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 text-[10px] font-semibold rounded-lg transition-colors"
            >
              Investigate →
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Product Discovery Intelligence
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discovery Feed</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-light">
            Evolving pain points, recurring themes, and customer insights based on active research.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={openUploadModal}
            className="px-4 py-2 bg-slate-100 border border-[#E2E8F0] hover:border-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5">
            📥 Ingest Customer Feedback
          </button>
          <button onClick={openCreateClaimModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-md shadow-blue-600/10 transition-colors flex items-center gap-1">
            ＋ Add Insight Hypothesis
          </button>
        </div>
      </div>


      {/* ── Metrics Row ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-lg flex flex-col justify-between h-28 hover:border-[#CBD5E1] transition-colors">
            <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Hypotheses & Pain Points</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">{claims.length}</span>
              <span className="text-[9px] font-mono text-emerald-400 uppercase">● Active</span>
            </div>
            <div className="text-[9px] text-slate-400 border-t border-[#E2E8F0]/60 pt-1.5 mt-1 flex justify-between">
              <span>Factual Insights: {claims.filter((c:any)=>c.type==='operational_fact').length}</span>
              <span>Assumptions: {claims.filter((c:any)=>c.type==='assumption').length}</span>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-lg flex flex-col justify-between h-28 hover:border-[#CBD5E1] transition-colors">
            <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Insight Confidence</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">{avgConfidence}%</span>
                <span className="text-[9px] font-mono text-blue-400">Target &gt;80%</span>
              </div>
              <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${
                  avgConfidence >= 80 ? 'bg-emerald-500' : avgConfidence >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                }`} style={{ width: `${avgConfidence}%` }} />
              </div>
            </div>
            <div className="text-[9px] text-slate-400 border-t border-[#E2E8F0]/60 pt-1.5 mt-1">Average certitude of claims</div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-lg flex flex-col justify-between h-28 hover:border-[#CBD5E1] transition-colors">
            <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Unresolved Risks</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono ${criticalCount > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                {criticalCount}
              </span>
              {criticalCount > 0 && <span className="text-[9px] font-mono text-red-400 uppercase animate-pulse">Critical</span>}
            </div>
            <div className="text-[9px] text-slate-400 border-t border-[#E2E8F0]/60 pt-1.5 mt-1 flex justify-between">
              <span>Drifts: {activeDiscoveries.filter((d:any)=>d.type==='belief_drift').length}</span>
              <span>Conflicts: {activeDiscoveries.filter((d:any)=>d.type==='contradiction').length}</span>
            </div>
          </div>

          <MetricCard
            label="Stale User Insights"
            value={staleCount}
            color={staleCount > 0 ? 'text-amber-500' : 'text-emerald-400'}
            note={staleCount > 0 ? 'Requires refresh' : 'Up to date'}
            sub="Requires fresh validation campaigns"
          />
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Intelligence Feed — discoveries */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-xl flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#E2E8F0]/60">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Customer Insights & Contradictions</h2>
              <p className="text-[11px] text-slate-400 font-light mt-0.5">
                Automatically flags where customer interviews diverge from assumptions.
              </p>
            </div>
            <button onClick={() => navigate(`/workspaces/${wsId}/discoveries`)}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold font-mono transition-colors">
              VIEW ALL INSIGHTS ↗
            </button>
          </div>

          {loadingDiscoveries ? (
            <div className="space-y-3 flex-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-50 border border-[#E2E8F0] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeDiscoveries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <span className="text-3xl mb-3">✅</span>
              <p className="text-sm font-semibold text-slate-700">All Hypotheses Validated</p>
              <p className="text-xs text-slate-500 font-light mt-1 max-w-xs">
                No active anomalies or contradictions. Upload fresh call logs or transcripts to continue discovery.
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {activeDiscoveries.slice(0, 4).map((disc: any) => (
                <div key={disc.id}
                  className="p-4 rounded-xl border border-[#E2E8F0]/80 bg-slate-50 hover:border-slate-300 transition-colors flex gap-3 cursor-pointer"
                  onClick={() => navigate(`/workspaces/${wsId}/discoveries`)}>
                  <div className="text-lg pt-0.5 flex-shrink-0">{DISC_ICONS[disc.type] || '🔎'}</div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {disc.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${
                        disc.severity > 0.8 ? 'bg-red-50 text-red-600 border-red-200' :
                        disc.severity > 0.6 ? 'bg-amber-950/30 text-amber-400 border-amber-900/60' :
                        'bg-slate-100 text-slate-400 border-[#E2E8F0]'
                      }`}>
                        {Math.round(disc.severity * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-light leading-relaxed line-clamp-2">{disc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Weakest Hypotheses */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#E2E8F0]/60">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Weakest Hypotheses</h2>
                <p className="text-[10px] text-slate-400 font-light mt-0.5">Assumptions requiring validation data</p>
              </div>
              <button onClick={() => navigate(`/workspaces/${wsId}/claims`)}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold font-mono transition-colors">
                VIEW HYPOTHESES ↗
              </button>
            </div>
            {loadingClaims ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : claims.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono text-center py-4">No hypotheses added.</p>
            ) : (
              <div className="space-y-2">
                {claims
                  .filter((c: any) => c.type === 'assumption')
                  .sort((a: any, b: any) => (a.confidence ?? 0) - (b.confidence ?? 0))
                  .slice(0, 3)
                  .map((claim: any) => (
                    <div key={claim.id} className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-semibold text-slate-800 truncate">{claim.title}</h4>
                        <div className="font-mono text-[9px] text-slate-500">
                          Confidence: {Math.round((claim.confidence ?? 0) * 100)}%
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                        claim.confidence < 0.4 ? 'bg-red-50 text-red-655 border border-red-200' :
                        claim.confidence < 0.7 ? 'bg-amber-950/30 text-amber-400 border border-amber-900/60' :
                        'bg-emerald-950/30 text-emerald-400 border border-emerald-900/60'
                      }`}>
                        {claim.confidence < 0.4 ? 'Critical' : claim.confidence < 0.7 ? 'Low' : 'Verified'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Engine Status */}
          <div className="bg-gradient-to-br from-[#FFFFFF] to-[#F9F9FB] border border-[#E2E8F0] rounded-xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-[-30%] right-[-20%] w-32 h-32 bg-blue-50/50 rounded-full blur-[60px] pointer-events-none" />
            <h3 className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-1.5">Discovery Agent</h3>
            <p className="text-slate-500 text-[10px] font-light leading-relaxed mb-3">
              Monitors and updates confidence ratings on user pain points, aligning qualitative user data with quantitative product metrics.
            </p>
            <div className="text-[9px] font-mono text-slate-400 bg-slate-100 p-3 rounded-lg border border-[#E2E8F0]/60 space-y-1.5">
              <div className="flex justify-between">
                <span>Contradictions:</span>
                <span className="text-slate-800">{activeDiscoveries.filter((d:any)=>d.type==='contradiction').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Hypotheses:</span>
                <span className="text-slate-800">{claims.length}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#E2E8F0]/40 mt-1">
                <span>Status:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Listening to customer channels
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
