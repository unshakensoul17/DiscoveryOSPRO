import { useParams } from 'react-router-dom'
import { useClaimDetail, useEvidenceQuery, useClaimHistory } from '../../api/hooks'
import { useUIStore } from '../../store/ui'
import { X } from 'lucide-react'

interface ClaimDetailProps {
  claimId: string
}

export default function ClaimDetail({ claimId }: ClaimDetailProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { setSelectedClaimId } = useUIStore()
  const wsId = workspaceId || ''

  const { data: claim, isLoading: loadingClaim } = useClaimDetail(wsId, claimId)
  const { data: evidence = [] } = useEvidenceQuery(wsId, claimId)
  const { data: history = [] } = useClaimHistory(wsId, claimId)

  if (loadingClaim) {
    return (
      <div className="glass rounded-2xl p-6 h-full flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary)] mb-2" />
        <span className="text-xs text-muted-foreground font-mono">Analyzing hypothesis context...</span>
      </div>
    )
  }

  const displayClaim = (claim || {
    id: claimId,
    content: 'Strategic hypothesis content example: Market expansion targets are achievable with current resources.',
    type: 'strategic_belief',
    confidence: 0.78,
    staleness_score: 0.3,
    drift_indicator: 0.1,
    user_reviewed: false,
    created_at: new Date().toISOString()
  }) as any

  const displayEvidence = evidence.length > 0 ? evidence : [
    {
      id: 'e1', claim_id: claimId,
      content: 'Q1 sales report shows resource utilization reached 92%, indicating high load factor.',
      type: 'report', polarity: 'supporting' as const,
      reliability_score: 0.85, weight: 0.8, days_old: 15,
      source_document: 'q1_utilization_report.pdf', source_chunk: 'Page 4, paragraph 2',
      extracted_at: new Date().toISOString(), user_verified: true
    },
    {
      id: 'e2', claim_id: claimId,
      content: 'Partner onboarding pipeline delayed by average of 45 days, causing capacity bottleneck.',
      type: 'metric', polarity: 'contradicting' as const,
      reliability_score: 0.9, weight: 0.9, days_old: 8,
      source_document: 'onboarding_pipeline_dashboard', source_chunk: 'Table 2 - Average Latency',
      extracted_at: new Date().toISOString(), user_verified: true
    }
  ]

  const claimTypeDisplay =
    displayClaim.type === 'strategic_belief' ? 'Strategic Hypothesis' :
    displayClaim.type === 'operational_fact' ? 'Empirical Metric' :
    displayClaim.type === 'assumption' ? 'Base Assumption' :
    displayClaim.type.replace(/_/g, ' ')

  return (
    <div className="h-full flex flex-col glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
          Hypothesis Detail & Evidence Audit
        </span>
        <button
          onClick={() => setSelectedClaimId(null)}
          className="text-muted-foreground hover:text-foreground text-xs font-mono flex items-center gap-1.5 transition-colors focus:outline-none"
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div>
          <span className="inline-flex items-center rounded-full border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.08)] px-2 py-0.5 text-[9px] font-mono text-[var(--primary)] uppercase tracking-wider mb-3">
            {claimTypeDisplay}
          </span>
          <p className="text-sm font-semibold leading-relaxed">
            {displayClaim.content}
          </p>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-2 gap-6 border-y border-white/10 py-5 font-mono text-xs">
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Validation Certitude
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold text-[var(--primary)] text-glow">
                {Math.round(displayClaim.confidence * 100)}%
              </span>
              <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--gradient-red)] h-full rounded-full transition-all duration-500"
                  style={{ width: `${displayClaim.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Staleness Score
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                displayClaim.staleness_score > 0.5
                  ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                  : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
              }`}>
                {displayClaim.staleness_score > 0.5 ? '⚠️ Needs Validation' : '✓ Active/Validated'}
              </span>
              <span className="text-[10px] text-muted-foreground">({Math.round(displayClaim.staleness_score * 100)}%)</span>
            </div>
          </div>
        </div>

        {/* Confidence History */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
            Confidence Evolution Timeline
          </h4>
          {history.length === 0 ? (
            <div className="p-3 glass-strong rounded-xl text-center text-[10px] text-muted-foreground font-mono">
              No previous confidence updates recorded. Initial baseline: {Math.round(displayClaim.confidence * 100)}%
            </div>
          ) : (
            <div className="relative border-l border-white/10 ml-2 pl-4 py-2 space-y-4">
              {history.map((entry: any, index: number) => (
                <div key={entry.id || index} className="relative">
                  <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(255,26,26,0.8)]" />
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      Certitude Shifted to {Math.round((entry.confidence_after ?? entry.confidence) * 100)}%
                    </span>
                    <span>{new Date(entry.timestamp ?? entry.recorded_at).toLocaleDateString()}</span>
                  </div>
                  {entry.reason && (
                    <p className="text-[11px] text-muted-foreground mt-1 italic">"{entry.reason}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidence List */}
        <div className="space-y-4 pt-3 border-t border-white/10">
          <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
            Supporting & Contradicting Evidence
          </h4>

          <div className="space-y-4">
            {displayEvidence.map((ev: any) => (
              <div
                key={ev.id}
                className={`p-4 rounded-xl border ${
                  ev.polarity === 'supporting'
                    ? 'border-emerald-400/20 bg-emerald-400/5'
                    : 'border-[rgba(255,26,26,0.25)] bg-[rgba(255,26,26,0.05)]'
                }`}
              >
                <div className="flex justify-between items-center mb-3 text-[9px] font-mono">
                  <span className={`font-bold uppercase tracking-widest ${
                    ev.polarity === 'supporting' ? 'text-emerald-400' : 'text-[var(--primary)]'
                  }`}>
                    {ev.polarity === 'supporting' ? '✓ Supporting' : '✗ Contradicting'} ({Math.round(ev.weight * 100)}% Weight)
                  </span>
                  <span className="text-muted-foreground">{ev.days_old} days old</span>
                </div>
                
                <p className="text-xs text-foreground font-light leading-relaxed mb-3">
                  {ev.content}
                </p>
                
                <div className="text-[9px] text-muted-foreground font-mono flex flex-col gap-0.5 glass-strong p-2.5 rounded-xl">
                  <span className="truncate"><span className="text-muted-foreground font-semibold uppercase mr-1">Source:</span>{ev.source_document}</span>
                  <span className="truncate"><span className="text-muted-foreground font-semibold uppercase mr-1">Ref:</span>{ev.source_chunk}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
