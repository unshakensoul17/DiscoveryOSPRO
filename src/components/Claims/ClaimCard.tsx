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
          : 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-slate-300 hover:bg-[#F8FAFC]'
      }`}
    >
      {/* Content */}
      <p className="text-xs font-medium text-slate-900 line-clamp-2 leading-relaxed">{claim.content}</p>
      
      {/* Type badge */}
      <div className="mt-4 flex items-center justify-between">
        <span className="inline-block px-2 py-0.5 border border-[#CBD5E1] text-slate-600 text-[10px] font-medium rounded bg-slate-100 uppercase tracking-wider">
          {claim.type === 'strategic_belief' ? 'Strategic Idea' :
           claim.type === 'metric' ? 'Metric Stat' :
           claim.type === 'assumption' ? 'Untested Assumption' :
           claim.type === 'operational_fact' ? 'Known Fact' :
           String(claim.type).replace(/_/g, ' ')}
        </span>
        
        {/* Confidence score */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-700">
            {Math.round(claim.confidence * 100)}% Confidence
          </span>
          <div className="w-12 h-1.5 bg-slate-100 border border-[#CBD5E1] rounded-full overflow-hidden">
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
      <div className="mt-3.5 pt-3 border-t border-[#E2E8F0]/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span className="text-emerald-600 font-semibold">
            ✓ {claim.evidence_count?.supporting || 0} Pro
          </span>
          <span className="text-red-600 font-semibold">
            ✗ {claim.evidence_count?.contradicting || 0} Con
          </span>
        </div>
        <span>
          {new Date(claim.updated_at).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  )
}