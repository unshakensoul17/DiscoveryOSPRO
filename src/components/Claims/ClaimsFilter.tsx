import { useUIStore } from '../../store/ui'

export default function ClaimsFilter() {
  const { claimsFilters, setClaimsFilters } = useUIStore()

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-4">Filter Hypotheses</h3>
      </div>
      
      <div className="flex flex-col">
        <label className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Status
        </label>
        <select
          value={claimsFilters.status || ''}
          onChange={(e) => setClaimsFilters({ status: (e.target.value || null) as any })}
          className="bg-[#F1F5F9] border border-[#CBD5E1] hover:border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
        >
          <option value="active">Active Hypotheses</option>
          <option value="archived">Archived Hypotheses</option>
          <option value="">All Statuses</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Hypothesis Type
        </label>
        <select
          value={claimsFilters.type || ''}
          onChange={(e) => setClaimsFilters({ type: e.target.value || null })}
          className="bg-[#F1F5F9] border border-[#CBD5E1] hover:border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
        >
          <option value="">All Types</option>
          <option value="strategic_belief">Strategic Hypothesis</option>
          <option value="metric">Empirical Metric</option>
          <option value="assumption">Base Assumption</option>
          <option value="operational_fact">Operational Fact</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Insight Age
        </label>
        <select
          value={claimsFilters.staleness || ''}
          onChange={(e) => setClaimsFilters({ staleness: (e.target.value || null) as any })}
          className="bg-[#F1F5F9] border border-[#CBD5E1] hover:border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
        >
          <option value="">All Ages</option>
          <option value="fresh">Fresh (&lt; 5d)</option>
          <option value="aging">Aging (&gt; 10d)</option>
          <option value="stale">Stale (&gt; 30d)</option>
        </select>
      </div>
    </div>
  )
}
