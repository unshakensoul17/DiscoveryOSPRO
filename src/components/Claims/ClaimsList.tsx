import { Claim } from '../../types'
import ClaimCard from './ClaimCard'
import { useUIStore } from '../../store/ui'

interface ClaimsListProps {
  claims: Claim[]
  isLoading: boolean
  onSelectClaim: (id: string) => void
}

export default function ClaimsList({ claims, isLoading, onSelectClaim }: ClaimsListProps) {
  const { selectedClaimId } = useUIStore()
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-28 glass-strong rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }
  
  if (!claims.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-xl">
        <span className="text-xl mb-2 text-muted-foreground">🔍</span>
        <p className="text-muted-foreground text-xs font-light">No hypotheses match filters</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <ClaimCard
          key={claim.id}
          claim={claim}
          isSelected={selectedClaimId === claim.id}
          onSelect={onSelectClaim}
        />
      ))}
    </div>
  )
}