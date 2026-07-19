import { Discovery } from '../../types'
import { motion } from 'framer-motion'

interface DiscoveryCardProps {
  discovery: Discovery
  onSelect?: (id: string) => void
}

const discoveryTypeColors = {
  belief_drift: 'bg-orange-950/30 text-orange-400 border-orange-900/60',
  contradiction: 'bg-red-50 text-red-600 border-red-900/60',
  stale_evidence: 'bg-yellow-950/30 text-yellow-450 border-yellow-900/60',
  assumption_exposure: 'bg-purple-950/30 text-purple-400 border-purple-900/60',
  unknown_unknown: 'bg-blue-950/30 text-blue-600 border-blue-900/60',
  research_bias: 'bg-pink-950/30 text-pink-400 border-pink-900/60',
}

const TYPE_LABELS: Record<string, string> = {
  belief_drift: 'Belief Drift / Shift',
  contradiction: 'Contradiction Detected',
  stale_evidence: 'Stale User Research',
  assumption_exposure: 'Goal Risk Exposure',
  unknown_unknown: 'Horizon Risk Scan',
  research_bias: 'Methodology Bias',
}

export default function DiscoveryCard({ discovery, onSelect }: DiscoveryCardProps) {
  const colorClass = discoveryTypeColors[discovery.type as keyof typeof discoveryTypeColors] || 'bg-slate-100 text-slate-400 border-slate-900/60'
  
  return (
    <motion.div
      whileHover={{ y: -1 }}
      onClick={() => onSelect?.(discovery.id)}
      className="p-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] hover:border-slate-200 hover:bg-[#121725] transition-all cursor-pointer"
    >
      {/* Type badge */}
      <div className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-mono font-bold border mb-3 uppercase tracking-wider ${colorClass}`}>
        {TYPE_LABELS[discovery.type] || discovery.type.replace(/_/g, ' ')}
      </div>
      
      {/* Description */}
      <p className="text-xs text-slate-800 font-light leading-relaxed mb-4 line-clamp-2">{discovery.description}</p>
      
      {/* Severity bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1 text-[9px] font-mono">
          <span className="text-slate-500 uppercase font-semibold">Risk Exposure Level</span>
          <span className="text-slate-400 font-bold">
            {Math.round(discovery.severity * 100)}%
          </span>
        </div>
        <div className="w-full h-1 bg-slate-100 border border-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              discovery.severity > 0.7 ? 'bg-red-500' : discovery.severity > 0.4 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${discovery.severity * 100}%` }}
          />
        </div>
      </div>
      
      {/* Status and date */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-3 border-t border-[#E2E8F0]/60">
        <span className={`px-2 py-0.5 rounded border uppercase font-bold text-[8px] tracking-wider ${
          discovery.status === 'active'
            ? 'bg-red-950/20 text-red-400 border-red-900/40'
            : 'bg-slate-100 text-slate-400 border-[#E2E8F0]'
        }`}>
          {discovery.status}
        </span>
        <span>{new Date(discovery.detected_at).toLocaleDateString()}</span>
      </div>
    </motion.div>
  )
}