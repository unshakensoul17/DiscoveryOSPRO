import { useUIStore } from '../../store/ui'

export default function ClaimsFilter() {
  const { claimsFilters, setClaimsFilters, resetClaimsFilters } = useUIStore()

  const isFiltered = !!(claimsFilters.status || claimsFilters.type || claimsFilters.staleness || claimsFilters.search || (claimsFilters.confidenceRange && claimsFilters.confidenceRange[0] > 0))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Filter Findings</h3>
        {isFiltered && (
          <button
            onClick={resetClaimsFilters}
            className="text-[10px] text-blue-600 hover:text-blue-500 font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="flex flex-col">
        <label className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Search Keyword
        </label>
        <input
          type="text"
          value={claimsFilters.search || ''}
          onChange={(e) => setClaimsFilters({ search: e.target.value || null })}
          placeholder="Type to search..."
          className="bg-[#F1F5F9] border border-[#CBD5E1] hover:border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 transition-colors"
        />
      </div>
      
      {/* Status Filter */}
      <div className="flex flex-col">
        <label className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Status
        </label>
        <select
          value={claimsFilters.status || ''}
          onChange={(e) => setClaimsFilters({ status: (e.target.value || null) as any })}
          className="bg-[#F1F5F9] border border-[#CBD5E1] hover:border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Findings</option>
          <option value="archived">Archived / Resolved</option>
        </select>
      </div>

      {/* Category / Type Filter */}
      <div className="flex flex-col">
        <label className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Insight Category
        </label>
        <select
          value={claimsFilters.type || ''}
          onChange={(e) => setClaimsFilters({ type: e.target.value || null })}
          className="bg-[#F1F5F9] border border-[#CBD5E1] hover:border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
        >
          <option value="">All Categories</option>
          <option value="strategic_belief">Strategic Idea</option>
          <option value="metric">Metric Stat & Data</option>
          <option value="assumption">Untested Assumption</option>
          <option value="operational_fact">Known Fact</option>
        </select>
      </div>

      {/* Age Filter */}
      <div className="flex flex-col">
        <label className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Feedback Recency / Age
        </label>
        <select
          value={claimsFilters.staleness || ''}
          onChange={(e) => setClaimsFilters({ staleness: (e.target.value || null) as any })}
          className="bg-[#F1F5F9] border border-[#CBD5E1] hover:border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer"
        >
          <option value="">All Data Ages</option>
          <option value="fresh">Recent (&lt; 5 days)</option>
          <option value="aging">Moderate (&gt; 10 days)</option>
          <option value="stale">Old / Stale (&gt; 30 days)</option>
        </select>
      </div>

      {/* Min Accuracy Score Slider */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            Min Confidence Score
          </label>
          <span className="text-[10px] font-mono font-bold text-slate-700">
            {Math.round(((claimsFilters.confidenceRange ? claimsFilters.confidenceRange[0] : 0) * 100))}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={claimsFilters.confidenceRange ? claimsFilters.confidenceRange[0] : 0}
          onChange={(e) => setClaimsFilters({ confidenceRange: [parseFloat(e.target.value), 1] })}
          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>
    </div>
  )
}
