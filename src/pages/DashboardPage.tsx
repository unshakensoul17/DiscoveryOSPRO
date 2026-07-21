import { useParams, useNavigate } from 'react-router-dom'
import { useClaimsQuery, useDiscoveriesQuery } from '../api/hooks'
import { useUIStore } from '../store/ui'
import { HeroPanel } from '../components/dashboard/HeroPanel'
import { DiscoveriesInsights } from '../components/dashboard/DiscoveriesInsights'
import { HypothesesOverview } from '../components/dashboard/HypothesesOverview'
import { GlassCard } from '../components/dashboard/GlassCard'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { openUploadModal, openCreateClaimModal, setActiveNav } = useUIStore()
  const wsId = workspaceId || ''

  const { data: claims      = [], isLoading: loadingClaims }      = useClaimsQuery(wsId)
  const { data: discoveries = [], isLoading: loadingDiscoveries } = useDiscoveriesQuery(wsId)

  const loading = loadingClaims || loadingDiscoveries

  // Derived metrics from real data
  const avgConfidence    = claims.length
    ? Math.round((claims.reduce((a: number, c: any) => a + (c.confidence ?? 0), 0) / claims.length) * 100)
    : 0
  const activeDiscoveries = discoveries.filter((d: any) => d.status === 'active')
  const criticalCount     = activeDiscoveries.filter((d: any) => d.severity > 0.75).length
  const staleCount        = claims.filter((c: any) => (c.staleness_score ?? 0) > 0.5).length

  const foundationalAlert = activeDiscoveries.find((d: any) =>
    d.type === 'assumption_exposure' && d.severity >= 0.7
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Hero Panel — live stats from backend */}
      {loading ? (
        <div className="glass grid-noise rounded-3xl p-8 md:p-10 h-64 animate-pulse" />
      ) : (
        <HeroPanel
          activeHypothesesCount={claims.length}
          unresolvedRisksCount={criticalCount}
          avgConfidence={avgConfidence}
        />
      )}

      {/* Critical Assumption Alert */}
      {foundationalAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.06)] p-5"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,26,26,0.2),transparent_60%)] blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="text-2xl flex-shrink-0">🚨</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--primary)] border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.1)] px-2 py-0.5 rounded-full">
                  Critical Insight Alert
                </span>
                <span className="text-[9px] font-mono text-[var(--primary)]">
                  Risk Level {Math.round(foundationalAlert.severity * 100)}%
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-snug">{foundationalAlert.description}</p>
              <p className="text-[11px] text-muted-foreground mt-1 font-light">
                Insight validation may be blocked by this unverified user assumption.
              </p>
            </div>
            <button
              onClick={() => navigate(`/workspaces/${wsId}/discoveries`)}
              className="flex-shrink-0 px-3 py-1.5 glass-strong text-[var(--primary)] text-[10px] font-semibold rounded-xl transition-colors hover:bg-white/10"
            >
              Investigate →
            </button>
          </div>
        </motion.div>
      )}

      {/* Metrics Row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-5 h-28 flex flex-col justify-between" hover={false}>
            <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Hypotheses & Pain Points</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono">{claims.length}</span>
              <span className="text-[9px] font-mono text-emerald-400 uppercase">● Active</span>
            </div>
            <div className="text-[9px] text-muted-foreground border-t border-white/10 pt-1.5 mt-1 flex justify-between">
              <span>Facts: {claims.filter((c:any)=>c.type==='operational_fact').length}</span>
              <span>Assumptions: {claims.filter((c:any)=>c.type==='assumption').length}</span>
            </div>
          </GlassCard>

          <GlassCard className="p-5 h-28 flex flex-col justify-between" hover={false}>
            <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Insight Confidence</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-extrabold font-mono">{avgConfidence}%</span>
                <span className="text-[9px] font-mono text-sky-400">Target &gt;80%</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    avgConfidence >= 80 ? 'bg-emerald-500' : avgConfidence >= 60 ? 'bg-sky-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${avgConfidence}%` }}
                />
              </div>
            </div>
            <div className="text-[9px] text-muted-foreground border-t border-white/10 pt-1.5 mt-1">Average certitude of claims</div>
          </GlassCard>

          <GlassCard className="p-5 h-28 flex flex-col justify-between" hover={false}>
            <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Unresolved Risks</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono ${criticalCount > 0 ? 'text-[var(--primary)] text-glow' : 'text-emerald-400'}`}>
                {criticalCount}
              </span>
              {criticalCount > 0 && <span className="text-[9px] font-mono text-[var(--primary)] uppercase animate-pulse">Critical</span>}
            </div>
            <div className="text-[9px] text-muted-foreground border-t border-white/10 pt-1.5 mt-1 flex justify-between">
              <span>Drifts: {activeDiscoveries.filter((d:any)=>d.type==='belief_drift').length}</span>
              <span>Conflicts: {activeDiscoveries.filter((d:any)=>d.type==='contradiction').length}</span>
            </div>
          </GlassCard>

          <GlassCard className="p-5 h-28 flex flex-col justify-between" hover={false}>
            <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Stale User Insights</div>
            <div className={`text-3xl font-extrabold font-mono ${staleCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {staleCount}
            </div>
            <div className="text-[9px] text-muted-foreground border-t border-white/10 pt-1.5 mt-1">
              {staleCount > 0 ? 'Requires fresh validation' : 'All up to date'}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discoveries Insights — live from backend */}
        <div className="lg:col-span-2">
          {loadingDiscoveries ? (
            <div className="glass rounded-2xl p-6 h-64 animate-pulse" />
          ) : (
            <DiscoveriesInsights discoveries={discoveries} />
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Weakest Hypotheses — live from backend */}
          {loadingClaims ? (
            <div className="glass rounded-2xl p-6 h-48 animate-pulse" />
          ) : (
            <HypothesesOverview claims={claims} />
          )}

          {/* Engine Status */}
          <GlassCard className="p-5" hover={false}>
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,26,26,0.15),transparent_60%)] blur-xl" />
            <h3 className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase mb-1.5">Discovery Agent</h3>
            <p className="text-muted-foreground text-[10px] font-light leading-relaxed mb-3">
              Monitors and updates confidence ratings on user pain points, aligning qualitative user data with quantitative product metrics.
            </p>
            <div className="text-[9px] font-mono text-muted-foreground glass-strong p-3 rounded-xl space-y-1.5">
              <div className="flex justify-between">
                <span>Contradictions:</span>
                <span className="text-foreground">{activeDiscoveries.filter((d:any)=>d.type==='contradiction').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Hypotheses:</span>
                <span className="text-foreground">{claims.length}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10 mt-1">
                <span>Status:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Listening
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
