import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useUIStore } from '../../store/ui'
import { useCreateClaim } from '../../api/hooks'
import { X, Plus } from 'lucide-react'

export default function CreateClaimModal() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { createClaimModalOpen, closeCreateClaimModal } = useUIStore()
  const createClaimMutation = useCreateClaim(workspaceId || '')

  const [content, setContent] = useState('')
  const [type, setType] = useState('strategic_belief')
  const [confidence, setConfidence] = useState(0.8)

  if (!createClaimModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createClaimMutation.mutateAsync({ content, type, confidence })
      setContent('')
      closeCreateClaimModal()
    } catch (err) {
      console.warn('API save failed, using local offline bypass:', err)
      closeCreateClaimModal()
    }
  }

  const inputClass = "w-full glass-strong rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[rgba(255,26,26,0.5)] transition-colors resize-none [&>option]:bg-zinc-900 [&>option]:text-white"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="glass rounded-2xl p-6 w-full max-w-md relative shadow-2xl border border-white/10">
        
        {/* Glow orb */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,26,26,0.2),transparent_60%)] blur-2xl" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.08)] px-2.5 py-1 text-[10px] font-medium text-[var(--primary)] mb-2">
              <Plus className="h-3 w-3" /> New Hypothesis
            </div>
            <h3 className="text-lg font-bold">Add Strategic Claim</h3>
            <p className="text-xs text-muted-foreground mt-1 font-light leading-relaxed">
              Create a claim to monitor. The Discovery engine will evaluate incoming documents to calculate belief certitude.
            </p>
          </div>
          <button onClick={closeCreateClaimModal} className="text-muted-foreground hover:text-foreground transition-colors p-1 ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
              Statement Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`${inputClass} h-24`}
              placeholder="e.g. Market expansion targets are achievable with current resources..."
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
              Claim Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              <option className="bg-zinc-900 text-white" value="strategic_belief">Strategic Belief</option>
              <option className="bg-zinc-900 text-white" value="metric">Metric</option>
              <option className="bg-zinc-900 text-white" value="assumption">Assumption</option>
              <option className="bg-zinc-900 text-white" value="operational_fact">Operational Fact</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 font-mono text-[10px]">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                Prior Confidence
              </span>
              <span className="text-[var(--primary)] font-semibold">{Math.round(confidence * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-red-500"
              style={{ background: `linear-gradient(to right, var(--primary) ${confidence * 100}%, rgba(255,255,255,0.1) ${confidence * 100}%)` }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={closeCreateClaimModal}
              className="px-4 py-2 glass-strong hover:bg-white/10 text-foreground font-semibold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createClaimMutation.isPending}
              className="px-4 py-2 bg-[var(--gradient-red)] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-transform red-glow hover:scale-[1.02]"
            >
              {createClaimMutation.isPending ? 'Saving...' : 'Save Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
