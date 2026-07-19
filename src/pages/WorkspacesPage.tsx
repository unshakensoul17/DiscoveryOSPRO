import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../store/workspace'
import { apiClient } from '../api/client'

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { workspaces, setWorkspaces, selectWorkspace, addWorkspace, removeWorkspace } = useWorkspaceStore()
  const [loading, setLoading] = useState(true)

  // Creation Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    apiClient.get<any>('/workspaces')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data || [])
        setWorkspaces(list)
        setLoading(false)
      })
      .catch((err) => {
        console.warn('API workspaces list failed, using development fallbacks:', err)
        // Fallback: ONLY one default workspace named "Test Workspace"
        setWorkspaces([
          {
            id: 'ws-1',
            name: 'Test Workspace',
            description: 'Primary development and verification workspace.',
            created_by: 'u-1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            member_count: 5,
            role: 'admin',
            config: {
              evidence_weights: { report: 0.8, survey: 0.6 },
              stale_threshold_days: 30,
              confidence_decay_rate: 0.05
            }
          }
        ])
        setLoading(false)
      })
  }, [setWorkspaces])

  const handleSelect = (id: string) => {
    selectWorkspace(id)
    navigate(`/workspaces/${id}/dashboard`)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setSubmitting(true)
    setErrorMsg('')

    try {
      const { data } = await apiClient.post<any>('/workspaces', {
        name: newName,
        description: newDescription
      })
      
      addWorkspace(data)
      setShowCreateModal(false)
      setNewName('')
      setNewDescription('')
    } catch (err: any) {
      console.error('Failed to create workspace:', err)
      setErrorMsg(err?.response?.data?.detail || 'Failed to create workspace. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent triggering navigation to dashboard
    
    if (id === 'ws-1') {
      alert('The default workspace "ws-1" cannot be deleted.')
      return
    }

    if (!confirm('Are you sure you want to delete this workspace? All associated claims and data will be permanently removed from view.')) {
      return
    }

    try {
      await apiClient.delete(`/workspaces/${id}`)
      removeWorkspace(id)
    } catch (err) {
      console.error('Failed to delete workspace:', err)
      alert('Failed to delete workspace. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-25%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 my-12">
        <header className="text-center mb-12">
          <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-500/20 text-blue-400 text-xs font-mono rounded-full mb-3 uppercase tracking-wider">
            Consensus Environment Selector
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Select Your Environment
          </h1>
          <p className="text-slate-400 text-base max-w-lg mx-auto font-light">
            Each workspace represents an isolated network of claims, evidence, and logical contradictions.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => handleSelect(ws.id)}
                className="group relative bg-[#FFFFFF]/80 border border-[#E2E8F0] hover:border-blue-500/50 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 flex flex-col justify-between"
              >
                {/* Delete button (show only for non-default workspaces) */}
                {ws.id !== 'ws-1' && (
                  <button
                    onClick={(e) => handleDelete(e, ws.id)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400 p-1 rounded hover:bg-[#1E2538] transition-colors z-20"
                    title="Delete Workspace"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4 pr-6">
                    <div className="text-lg font-mono text-blue-400 font-semibold">
                      {ws.id.toUpperCase()}
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 border border-[#E2E8F0] text-slate-400 rounded-md uppercase tracking-wider bg-slate-100">
                      {ws.role || 'admin'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-400 transition-colors">
                    {ws.name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 font-light leading-relaxed">
                    {ws.description || 'No description provided for this sandbox.'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-[#E2E8F0]/60 pt-4 font-mono">
                  <span>👥 {ws.member_count || 1} active minds</span>
                  <span>📅 {ws.created_at ? new Date(ws.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {/* Create Workspace Trigger Card */}
            <div 
              onClick={() => setShowCreateModal(true)}
              className="border border-dashed border-[#E2E8F0] hover:border-blue-500/30 bg-slate-50 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer transition-colors group"
            >
              <span className="text-2xl mb-2 text-slate-500 group-hover:scale-110 transition-transform duration-200">＋</span>
              <h3 className="text-base font-bold text-slate-600 group-hover:text-blue-400 transition-colors">
                Create Workspace
              </h3>
              <p className="text-slate-500 text-xs mt-1 font-light max-w-[200px]">
                Establish a new environment for evidence-based verification.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#F9F9FB]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <span>🚀</span> Create New Workspace
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-light leading-relaxed">
              Create a fresh, empty workspace sandbox for claim verification and document ingestion.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-lg text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 font-mono">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F1F5F9] border border-[#CBD5E1] text-slate-900 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500/80 transition-colors"
                  placeholder="e.g. Fintech Project A"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 font-mono">
                  Workspace Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#F1F5F9] border border-[#CBD5E1] text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500/80 resize-none transition-colors"
                  placeholder="Verify core value propositions and metric evidence..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-850 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-semibold rounded-lg text-xs transition-colors shadow-md shadow-blue-600/10"
                >
                  {submitting ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
