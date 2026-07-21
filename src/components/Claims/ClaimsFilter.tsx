import { useUIStore } from '../../store/ui'

export default function ClaimsFilter() {
  const { claimsFilters, setClaimsFilters } = useUIStore()

  const selectClass = "w-full glass-strong rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-[rgba(255,26,26,0.5)] transition-colors cursor-pointer appearance-none [&>option]:bg-zinc-900 [&>option]:text-white"

  return (
    <div className="space-y-5">
      <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
        Filter Hypotheses
      </h3>
      
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
          Status
        </label>
        <select
          value={claimsFilters.status || ''}
          onChange={(e) => setClaimsFilters({ status: (e.target.value || null) as any })}
          className={selectClass}
        >
          <option className="bg-zinc-900 text-white" value="active">Active Hypotheses</option>
          <option className="bg-zinc-900 text-white" value="archived">Archived Hypotheses</option>
          <option className="bg-zinc-900 text-white" value="">All Statuses</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
          Hypothesis Type
        </label>
        <select
          value={claimsFilters.type || ''}
          onChange={(e) => setClaimsFilters({ type: e.target.value || null })}
          className={selectClass}
        >
          <option className="bg-zinc-900 text-white" value="">All Types</option>
          <option className="bg-zinc-900 text-white" value="strategic_belief">Strategic Hypothesis</option>
          <option className="bg-zinc-900 text-white" value="metric">Empirical Metric</option>
          <option className="bg-zinc-900 text-white" value="assumption">Base Assumption</option>
          <option className="bg-zinc-900 text-white" value="operational_fact">Operational Fact</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
          Insight Age
        </label>
        <select
          value={claimsFilters.staleness || ''}
          onChange={(e) => setClaimsFilters({ staleness: (e.target.value || null) as any })}
          className={selectClass}
        >
          <option className="bg-zinc-900 text-white" value="">All Ages</option>
          <option className="bg-zinc-900 text-white" value="fresh">Fresh (&lt; 5d)</option>
          <option className="bg-zinc-900 text-white" value="aging">Aging (&gt; 10d)</option>
          <option className="bg-zinc-900 text-white" value="stale">Stale (&gt; 30d)</option>
        </select>
      </div>
    </div>
  )
}
