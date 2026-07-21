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
      whileHover={{ y: -2 }}
      onClick={() => onSelect?.(claim.id)}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-[rgba(255,26,26,0.5)] bg-[rgba(255,26,26,0.08)] shadow-lg shadow-[rgba(255,26,26,0.15)]'
          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      {/* Content */}
      <p className="text-xs font-medium line-clamp-2 leading-relaxed">{claim.content}</p>
      
      {/* Type badge */}
      <div className="mt-4 flex items-center justify-between">
        <span className={`inline-block px-2 py-0.5 border text-[9px] font-mono rounded-full uppercase tracking-wider ${
          isSelected
            ? 'border-[rgba(255,26,26,0.35)] text-[var(--primary)] bg-[rgba(255,26,26,0.1)]'
            : 'border-white/10 text-muted-foreground bg-white/5'
        }`}>
          {claim.type === 'strategic_belief' ? 'Strategic' :
           claim.type === 'operational_fact' ? 'Empirical' :
           claim.type === 'assumption' ? 'Assumption' :
           claim.type.replace(/_/g, ' ')}
        </span>
        
        {/* Confidence score */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-muted-foreground">
            {Math.round(claim.confidence * 100)}%
          </span>
          <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                claim.confidence > 0.7 ? 'bg-emerald-500' : claim.confidence > 0.4 ? 'bg-amber-500' : 'bg-[var(--primary)]'
              }`}
              style={{ width: `${claim.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Evidence count & Date */}
      <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">
            ✓ {claim.evidence_count?.supporting || 0}
          </span>
          <span className="text-[var(--primary)]">
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