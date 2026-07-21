import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDiscoveriesQuery, useDismissDiscovery } from '../../api/hooks'
import { useUIStore } from '../../store/ui'

interface DiscoveryDetailProps {
  discoveryId: string
}

const TYPE_LABELS: Record<string, string> = {
  belief_drift: 'Belief Drift',
  contradiction: 'Contradiction Detected',
  stale_evidence: 'Stale User Research',
  assumption_exposure: 'Goal Risk Exposure',
  unknown_unknown: 'Horizon Risk Scan',
  research_bias: 'Methodology Bias',
}

const EFFORT_MAP: Record<string, { effort: string; hours: number }> = {
  contradiction: { effort: 'medium', hours: 12 },
  stale_evidence: { effort: 'low', hours: 4 },
  assumption_exposure: { effort: 'high', hours: 24 },
  belief_drift: { effort: 'medium', hours: 8 },
  research_bias: { effort: 'low', hours: 6 },
  unknown_unknown: { effort: 'high', hours: 20 },
}

const APPROACH_MAP: Record<string, string> = {
  contradiction: "Gather new metrics or qualitative reports. Cross-reference conflicting data sources and conduct stakeholder interviews to identify root cause.",
  stale_evidence: "Query campaign manager or analytics database for latest performance metrics. Pull last 30–90 days of raw data.",
  assumption_exposure: "Conduct targeted user interviews, A/B tests, or pilot programs to validate the underlying strategic assumption before committing resources.",
  belief_drift: "Run longitudinal confidence trend analysis. Identify which new evidence is driving drift and determine if the original belief should be updated.",
  research_bias: "Audit evidence collection methodology for selection bias. Expand sampling frame or use blind review process.",
  unknown_unknown: "Perform broad horizon scanning. Interview domain experts and review adjacent market signals to surface hidden risk factors.",
}

const EVIDENCE_MAP: Record<string, string> = {
  contradiction: "Reconciled metric log or secondary stakeholder audit report confirming correct interpretation.",
  stale_evidence: "Updated metrics spreadsheet or fresh operational report dated within the last 30 days.",
  assumption_exposure: "User survey data distribution, pilot test results, or signed agreements confirming the assumption.",
  belief_drift: "Time-series confidence chart with annotated causation events.",
  research_bias: "Peer-reviewed methodology audit or expanded sample dataset.",
  unknown_unknown: "Structured risk matrix with probability-impact scores for newly identified unknowns.",
}

export default function DiscoveryDetail({ discoveryId }: DiscoveryDetailProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const dismissMutation = useDismissDiscovery(workspaceId || '')
  const [campaignActive, setCampaignActive] = useState(false)

  // For details, we can find it in the discoveries query cache
  const { data: discoveries = [] } = useDiscoveriesQuery(workspaceId || '')
  const discovery = discoveries.find((d) => d.id === discoveryId)

  // Fallback mock if not found
  const displayDiscovery = discovery || {
    id: discoveryId,
    type: 'contradiction',
    severity: 0.85,
    description: 'Direct contradiction between customer survey and sales metrics on product pricing sensitivity.',
    status: 'active',
    detected_at: new Date().toISOString(),
    metadata: {
      claim_1: 'Product price is set correctly at $49/mo.',
      claim_2: 'Customer surveys indicate pricing is too high.',
    },
  }

  const label = TYPE_LABELS[displayDiscovery.type] || displayDiscovery.type.replace(/_/g, ' ')
  
  const effortConfig = EFFORT_MAP[displayDiscovery.type] || { effort: 'medium', hours: 10 }
  const approachText = displayDiscovery.metadata?.recommended_action || APPROACH_MAP[displayDiscovery.type] || "Collect fresh qualitative evidence and run cross-reference reviews."
  const evidenceText = EVIDENCE_MAP[displayDiscovery.type] || "Documented validation artifact or updated confidence scoring metrics."

  return (
    <div className="h-full flex flex-col glass-strong rounded-2xl overflow-hidden shadow-2xl border border-[rgba(255,26,26,0.3)] relative">
      {/* Background Glow */}
      <div className="pointer-events-none absolute top-[-20%] right-[-10%] w-64 h-64 bg-[radial-gradient(circle,rgba(255,26,26,0.15),transparent_60%)] blur-2xl" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
          Insight & Campaign Hub
        </span>
        <button
          onClick={() => {
            useUIStore.setState({ selectedDiscoveryId: null })
          }}
          className="text-muted-foreground hover:text-foreground text-[10px] font-mono flex items-center gap-1.5 transition-colors focus:outline-none"
        >
          <span>✕</span> CLOSE
        </button>
      </div>

      {/* Content area */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
        <div>
          <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase tracking-widest ${
            displayDiscovery.severity > 0.8
              ? 'bg-[rgba(255,26,26,0.1)] text-[var(--primary)] border-[rgba(255,26,26,0.3)]'
              : 'bg-amber-950/30 text-amber-500 border-amber-900/60'
          }`}>
            {label}
          </span>
          
          <p className="mt-4 text-sm text-foreground font-light leading-relaxed">
            {displayDiscovery.description}
          </p>
        </div>

        {/* Severity Details */}
        <div className="border-y border-white/10 py-5 flex justify-between items-center font-mono text-xs">
          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-semibold block mb-1 tracking-wider">
              Risk Level
            </span>
            <div className="flex items-center gap-2">
              {displayDiscovery.metadata?.previous_confidence && (
                <>
                  <span className="text-xl font-extrabold text-muted-foreground line-through opacity-70">
                    {displayDiscovery.metadata.previous_confidence}%
                  </span>
                  <span className="text-muted-foreground">➔</span>
                </>
              )}
              <span className="text-xl font-extrabold text-[var(--primary)]">
                {displayDiscovery.metadata?.new_confidence || Math.round(displayDiscovery.severity * 100)}%
              </span>
            </div>
            {displayDiscovery.metadata?.previous_confidence && (
              <span className="text-[8px] text-[var(--primary)] mt-1 block uppercase tracking-widest">
                Confidence Dropped Due to Evidence
              </span>
            )}
          </div>

          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-semibold block mb-1 tracking-wider">
              Detected On
            </span>
            <span className="text-foreground">
              {new Date(displayDiscovery.detected_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Conflict Details */}
        {displayDiscovery.metadata && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
              Conflicting Hypotheses
            </h4>
            <div className="space-y-3 text-xs leading-relaxed">
              {displayDiscovery.metadata.claim_1 && (
                <div className="p-4 glass border border-[rgba(255,26,26,0.2)] rounded-xl">
                  <span className="font-mono text-[9px] text-blue-400 font-semibold block mb-2 uppercase tracking-widest">Hypothesis A:</span>
                  <p className="text-foreground font-light">{displayDiscovery.metadata.claim_1}</p>
                </div>
              )}
              {displayDiscovery.metadata.claim_2 && (
                <div className="p-4 glass border border-[rgba(255,26,26,0.4)] bg-[rgba(255,26,26,0.05)] rounded-xl">
                  <span className="font-mono text-[9px] text-[var(--primary)] font-semibold block mb-2 uppercase tracking-widest">Hypothesis B:</span>
                  <p className="text-foreground font-light">{displayDiscovery.metadata.claim_2}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Affected Decisions */}
        {displayDiscovery.metadata?.affected_decisions && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
              Affected Decisions
            </h4>
            <div className="space-y-2">
              {displayDiscovery.metadata.affected_decisions.map((decision: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 glass border border-white/10 rounded-xl">
                  <span className="text-xs text-foreground font-semibold">{decision.decision}</span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-widest ${
                    decision.risk === 'HIGH' ? 'bg-[rgba(255,26,26,0.1)] text-[var(--primary)] border-[rgba(255,26,26,0.3)]' : 'bg-amber-950/30 text-amber-500 border-amber-900/60'
                  }`}>
                    {decision.risk} RISK
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active/Recommended Campaign Section */}
        <div className={`p-5 rounded-xl border transition-all ${
          campaignActive
            ? 'glass-strong border-[rgba(255,26,26,0.5)] shadow-[inset_0_0_20px_rgba(255,26,26,0.1)]'
            : 'glass border-white/10 hover:border-white/20'
        }`}>
          <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${campaignActive ? 'bg-[var(--primary)] shadow-[0_0_8px_rgba(255,26,26,0.8)] animate-pulse' : 'bg-white/20'}`} />
              <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${campaignActive ? 'text-[var(--primary)]' : 'text-muted-foreground'}`}>
                {campaignActive ? 'Active Validation Campaign' : 'Recommended Campaign Protocol'}
              </span>
            </div>
            <div className="flex gap-2 text-[9px] font-mono uppercase tracking-widest">
              <span className={`px-2 py-0.5 rounded font-bold ${campaignActive ? 'bg-[rgba(255,26,26,0.1)] text-[var(--primary)]' : 'bg-white/5 text-muted-foreground'}`}>
                Effort: {effortConfig.effort}
              </span>
              <span className={`px-2 py-0.5 rounded font-bold ${campaignActive ? 'bg-[rgba(255,26,26,0.15)] text-[var(--primary)]' : 'bg-white/5 text-muted-foreground'}`}>
                {effortConfig.hours}h Est
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed">
            <div>
              <span className="font-semibold text-foreground block mb-1">Suggested Investigation Approach</span>
              <p className="text-muted-foreground font-light">{approachText}</p>
            </div>
            <div>
              <span className="font-semibold text-foreground block mb-1">Expected Validation Evidence</span>
              <p className="text-muted-foreground font-light">{evidenceText}</p>
            </div>
          </div>

          {campaignActive && (
            <div className="mt-5 pt-4 border-t border-[rgba(255,26,26,0.2)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--primary)] font-mono">
                🚀 Upload fresh data in the Ingestion pipeline to resolve.
              </span>
              <button
                onClick={() => navigate(`/workspaces/${workspaceId}/ingest`)}
                className="px-4 py-2 bg-[var(--gradient-red)] hover:scale-[1.02] transition-transform text-white font-semibold rounded-lg text-[10px] red-glow"
              >
                Go to Upload 📥
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-white/10 flex gap-3">
          <button
            onClick={() => {
              dismissMutation.mutate(displayDiscovery.id, {
                onSuccess: () => {
                  useUIStore.setState({ selectedDiscoveryId: null })
                }
              })
            }}
            disabled={dismissMutation.isPending}
            className="flex-grow py-2.5 px-4 glass hover:bg-white/10 border-white/10 disabled:opacity-50 text-muted-foreground font-semibold rounded-xl text-xs transition-colors"
          >
            {dismissMutation.isPending ? 'Dismissing...' : 'Ignore Risk'}
          </button>
          {!campaignActive ? (
            <button
              onClick={() => setCampaignActive(true)}
              className="flex-grow py-2.5 px-4 bg-[var(--gradient-red)] text-white font-semibold rounded-xl text-xs transition-transform red-glow hover:scale-[1.02]"
            >
              Start Research Campaign
            </button>
          ) : (
            <button
              onClick={() => setCampaignActive(false)}
              className="flex-grow py-2.5 px-4 glass-strong hover:bg-white/10 text-foreground font-semibold rounded-xl text-xs transition-colors"
            >
              Pause Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

