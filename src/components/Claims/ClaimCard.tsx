import { Claim } from '../../types'
import { motion } from 'framer-motion'

interface ClaimCardProps {
  claim: Claim
  onSelect?: (id: string) => void
  isSelected?: boolean
}

export default function ClaimCard({ claim, onSelect, isSelected }: ClaimCardProps) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      onClick={() => onSelect?.(claim.id)}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500/80 bg-[#F1F5F9]/90 shadow-lg shadow-blue-550/5'
          : 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-slate-200 hover:bg-[#121725]'
      }`}
    >
      {/* Content */}
      <p className="text-xs font-medium text-slate-900 line-clamp-2 leading-relaxed">{claim.content}</p>
      
      {/* Type badge */}
      <div className="mt-4 flex items-center justify-between">
        <span className="inline-block px-2 py-0.5 border border-[#E2E8F0] text-slate-400 text-[9px] font-mono rounded bg-slate-950/40 uppercase tracking-wider">
          {claim.type === 'strategic_belief' ? 'Strategic Hypothesis' :
           claim.type === 'operational_fact' ? 'Empirical Metric' :
           claim.type === 'assumption' ? 'Base Assumption' :
           claim.type.replace(/_/g, ' ')}
        </span>
        
        {/* Confidence score */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-600">
            {Math.round(claim.confidence * 100)}%
          </span>
          <div className="w-12 h-1 bg-slate-100 border border-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                claim.confidence > 0.7 ? 'bg-emerald-500' : claim.confidence > 0.4 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${claim.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Evidence count & Date */}
      <div className="mt-3.5 pt-3 border-t border-[#E2E8F0]/60 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400/90">
            ✓ {claim.evidence_count?.supporting || 0}
          </span>
          <span className="text-red-400/90">
            ✗ {claim.evidence_count?.contradicting || 0}
          </span>
        </div>
        <span>
          {new Date(claim.updated_at).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  )
}