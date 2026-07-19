import { useParams } from 'react-router-dom'
import { useClaimDetail, useEvidenceQuery, useClaimHistory } from '../../api/hooks'
import { useUIStore } from '../../store/ui'

interface ClaimDetailProps {
  claimId: string
}

export default function ClaimDetail({ claimId }: ClaimDetailProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { setSelectedClaimId } = useUIStore()
  const wsId = workspaceId || ''

  // Queries
  const { data: claim, isLoading: loadingClaim } = useClaimDetail(wsId, claimId)
  const { data: evidence = [] } = useEvidenceQuery(wsId, claimId)
  const { data: history = [] } = useClaimHistory(wsId, claimId)

  if (loadingClaim) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2" />
        <span className="text-xs text-slate-500 font-mono">Analyzing hypothesis context...</span>
      </div>
    )
  }

  // Fallback mocks if detail not found or backend not initialized
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
      id: 'e1',
      claim_id: claimId,
      content: 'Q1 sales report shows resource utilization reached 92%, indicating high load factor.',
      type: 'report',
      polarity: 'supporting' as const,
      reliability_score: 0.85,
      weight: 0.8,
      days_old: 15,
      source_document: 'q1_utilization_report.pdf',
      source_chunk: 'Page 4, paragraph 2',
      extracted_at: new Date().toISOString(),
      user_verified: true
    },
    {
      id: 'e2',
      claim_id: claimId,
      content: 'Partner onboarding pipeline delayed by average of 45 days, causing capacity bottleneck.',
      type: 'metric',
      polarity: 'contradicting' as const,
      reliability_score: 0.9,
      weight: 0.9,
      days_old: 8,
      source_document: 'onboarding_pipeline_dashboard',
      source_chunk: 'Table 2 - Average Latency',
      extracted_at: new Date().toISOString(),
      user_verified: true
    }
  ]

  // Render mapped name for badges
  const claimTypeDisplay =
    displayClaim.type === 'strategic_belief' ? 'Strategic Hypothesis' :
    displayClaim.type === 'operational_fact' ? 'Empirical Metric' :
    displayClaim.type === 'assumption' ? 'Base Assumption' :
    displayClaim.type.replace(/_/g, ' ')

  return (
    <div className="h-full flex flex-col bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
          Hypothesis Detail & Evidence Audit
        </span>
        <button
          onClick={() => setSelectedClaimId(null)}
          className="text-slate-500 hover:text-slate-600 text-xs font-mono flex items-center gap-1.5 transition-colors focus:outline-none"
        >
          <span>✕</span> CLOSE
        </button>
      </div>

      {/* Content scroll area */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div>
          <span className="inline-block px-2 py-0.5 border border-[#E2E8F0] text-slate-400 text-[9px] font-mono rounded bg-slate-950/40 uppercase tracking-wider mb-3">
            {claimTypeDisplay}
          </span>
          <p className="text-sm text-slate-900 font-semibold leading-relaxed">
            {displayClaim.content}
          </p>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-2 gap-6 border-y border-[#E2E8F0]/60 py-5 font-mono text-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Validation Certitude
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold text-blue-400 font-mono">
                {Math.round(displayClaim.confidence * 100)}%
              </span>
              <div className="flex-1 bg-[#F1F5F9] border border-[#CBD5E1] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${displayClaim.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Staleness Score
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                displayClaim.staleness_score > 0.5
                  ? 'bg-amber-950/30 text-amber-400 border-amber-900/60'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}>
                {displayClaim.staleness_score > 0.5 ? '⚠️ Needs Validation' : '✓ Active/Validated'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">({Math.round(displayClaim.staleness_score * 100)}%)</span>
            </div>
          </div>
        </div>

        {/* ── Confidence History Timeline ── */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            Confidence Evolution Timeline
          </h4>
          {history.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-center text-[10px] text-slate-500 font-mono">
              No previous confidence updates recorded. Initial baseline level is {Math.round(displayClaim.confidence * 100)}%.
            </div>
          ) : (
            <div className="relative border-l border-[#E2E8F0] ml-2 pl-4 py-2 space-y-4">
              {history.map((entry: any, index: number) => (
                <div key={entry.id || index} className="relative">
                  {/* Timeline dot */}
                  <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-blue-500 border border-[#101420]" />
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Certitude Shifted to {Math.round((entry.confidence_after ?? entry.confidence) * 100)}%
                    </span>
                    <span className="text-slate-500">
                      {new Date(entry.timestamp ?? entry.recorded_at).toLocaleDateString()}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-[11px] text-slate-500 mt-1 italic">
                      "{entry.reason}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidence List */}
        <div className="space-y-4 pt-3 border-t border-[#E2E8F0]/60">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            Supporting & Contradicting Evidence
          </h4>

          <div className="space-y-4">
            {displayEvidence.map((ev) => (
              <div
                key={ev.id}
                className={`p-4 rounded-xl border ${
                  ev.polarity === 'supporting'
                    ? 'border-emerald-900/40 bg-emerald-950/5'
                    : 'border-red-900/40 bg-red-950/5'
                }`}
              >
                <div className="flex justify-between items-center mb-3 text-[9px] font-mono">
                  <span className={`font-bold uppercase tracking-widest ${
                    ev.polarity === 'supporting' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {ev.polarity === 'supporting' ? '✓ Supporting' : '✗ Contradicting'} ({Math.round(ev.weight * 100)}% Weight)
                  </span>
                  <span className="text-slate-500">
                    {ev.days_old} days old
                  </span>
                </div>
                
                <p className="text-xs text-slate-800 font-light leading-relaxed mb-3">
                  {ev.content}
                </p>
                
                <div className="text-[9px] text-slate-400 font-mono flex flex-col gap-0.5 bg-[#F9F9FB]/80 p-2.5 rounded-lg border border-[#E2E8F0]">
                  <span className="truncate text-slate-600"><span className="text-slate-400 font-semibold uppercase mr-1">Source:</span>{ev.source_document}</span>
                  <span className="truncate text-slate-600"><span className="text-slate-400 font-semibold uppercase mr-1">Ref:</span>{ev.source_chunk}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
