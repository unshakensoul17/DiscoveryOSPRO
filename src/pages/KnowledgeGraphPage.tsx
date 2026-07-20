import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../api/client'

interface GraphNode {
  id: string
  node_type?: string
  label?: string
  content?: string
  confidence?: number
  polarity?: string
  claim_type?: string
}

interface GraphEdge {
  source: string
  target: string
  relation_type: string
  weight?: number
}

interface Analytics {
  total_nodes: number
  total_edges: number
  claim_count: number
  top_pillar_beliefs: Array<{ id: string; content: string; pagerank_score: number; confidence: number }>
  isolated_assumptions: Array<{ id: string; content: string; confidence: number }>
}

interface ChatMessage {
  sender: 'user' | 'copilot'
  text: string
  citations?: Array<{ id: string; type: string; label: string }>
}

export default function KnowledgeGraphPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  // Copilot Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'copilot',
      text: 'Greetings! I am Discovery Copilot. Ask me any critical strategic question about your knowledge graph, claims, or contradicting evidence.',
    },
  ])
  const [queryInput, setQueryInput] = useState('')
  const [isAsking, setIsAsking] = useState(false)

  useEffect(() => {
    if (workspaceId) {
      fetchGraphData(workspaceId)
    }
  }, [workspaceId])

  const fetchGraphData = async (wsId: string) => {
    setLoading(true)
    try {
      const graphRes = await apiClient.get<any>(`/workspaces/${wsId}/graph`)
      setNodes(graphRes.data.nodes || [])
      setEdges(graphRes.data.edges || [])

      const analyticsRes = await apiClient.get<any>(`/workspaces/${wsId}/graph/analytics`)
      setAnalytics(analyticsRes.data)
    } catch (err) {
      console.error('Failed to load knowledge graph', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!queryInput.trim() || !workspaceId || isAsking) return

    const userQ = queryInput.trim()
    setQueryInput('')
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }])
    setIsAsking(true)

    try {
      const res = await apiClient.post<any>(`/workspaces/${workspaceId}/copilot/chat`, {
        query: userQ,
      })

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'copilot',
          text: res.data.answer || 'No answer generated.',
          citations: res.data.citations || [],
        },
      ])
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'copilot',
          text: `Error reaching Discovery Copilot: ${err?.message || 'Server error'}`,
        },
      ])
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-glow flex items-center gap-2" style={{ background: 'var(--gradient-red)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <span>🧠</span> Knowledge Graph & Discovery Copilot
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-light">
            GraphRAG-powered intelligence engine modeling relational claims, evidence, and polarities.
          </p>
        </div>

        <button
          onClick={() => workspaceId && fetchGraphData(workspaceId)}
          className="px-4 py-2 bg-[var(--gradient-red)] text-white font-semibold text-xs rounded-xl transition-transform red-glow hover:scale-[1.02] flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-Sync Knowledge Graph
        </button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Total Graph Nodes</div>
          <div className="text-2xl font-bold mt-1 text-foreground">{analytics?.total_nodes || 0}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Relational Edges</div>
          <div className="text-2xl font-bold mt-1 text-blue-400">{analytics?.total_edges || 0}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Pillar Beliefs</div>
          <div className="text-2xl font-bold mt-1 text-emerald-400">{analytics?.top_pillar_beliefs?.length || 0}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Unvalidated Assumptions</div>
          <div className="text-2xl font-bold mt-1 text-amber-500">{analytics?.isolated_assumptions?.length || 0}</div>
        </div>
      </div>

      {/* Main Grid: Visual Graph + Copilot Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Graph Node Explorer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-bold mb-4 flex items-center justify-between">
              <span>Graph Node Explorer ({nodes.length} Nodes)</span>
              <span className="text-[10px] font-mono text-muted-foreground">Click node for details</span>
            </h2>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono">
                Building workspace graph...
              </div>
            ) : nodes.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-xs font-light border-2 border-dashed border-white/10 rounded-xl">
                No graph nodes found. Upload a document in Ingestion Hub to build nodes.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedNode?.id === node.id
                        ? 'border-[rgba(255,26,26,0.5)] bg-[rgba(255,26,26,0.08)] shadow-lg shadow-[rgba(255,26,26,0.15)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                          node.node_type === 'claim'
                            ? 'bg-blue-900/20 text-blue-400 border-blue-800/40'
                            : node.node_type === 'evidence'
                            ? 'bg-purple-900/20 text-purple-400 border-purple-800/40'
                            : 'bg-white/5 text-muted-foreground border-white/10'
                        }`}
                      >
                        {node.node_type}
                      </span>
                      {node.confidence !== undefined && (
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {Math.round(node.confidence * 100)}% conf
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                      {node.content || node.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Node Drawer */}
          {selectedNode && (
            <div className="glass-strong rounded-2xl p-5 border border-[rgba(255,26,26,0.3)] animate-fade-in relative overflow-hidden">
              <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,26,26,0.15),transparent_70%)] blur-2xl" />
              <div className="flex items-center justify-between mb-3 relative">
                <span className="text-[10px] font-mono text-[var(--primary)] uppercase tracking-widest font-semibold">
                  Selected Node Inspector
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-muted-foreground hover:text-foreground text-xs cursor-pointer transition-colors"
                >
                  ✕ Close
                </button>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mb-3 relative">ID: {selectedNode.id}</div>
              <p className="text-sm font-medium text-foreground mb-4 leading-relaxed relative">{selectedNode.content || selectedNode.label}</p>

              {/* Connected Edges */}
              <div className="border-t border-white/10 pt-4 relative">
                <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Direct Relationships:</div>
                <div className="space-y-2">
                  {edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e, idx) => (
                      <div key={idx} className="text-xs text-foreground font-mono flex items-center gap-2 glass px-3 py-2 rounded-lg">
                        <span className="text-[var(--primary)] font-bold uppercase">{e.relation_type}</span>
                        <span className="text-muted-foreground">➔</span>
                        <span className="truncate">{e.source === selectedNode.id ? e.target : e.source}</span>
                      </div>
                    ))}
                  {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                    <div className="text-xs text-muted-foreground italic">No direct edges connected yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pillar Beliefs & Isolated Assumptions Breakdown */}
          {analytics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-5">
                <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <span className="text-emerald-400">★</span> PageRank Pillar Beliefs
                </h3>
                <div className="space-y-3">
                  {analytics.top_pillar_beliefs.map((b) => (
                    <div key={b.id} className="p-3 glass-strong rounded-xl">
                      <div className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">{b.content}</div>
                      <div className="text-[9px] text-emerald-400/80 mt-2 font-mono uppercase tracking-wider">Rank Score: {b.pagerank_score}</div>
                    </div>
                  ))}
                  {analytics.top_pillar_beliefs.length === 0 && (
                    <div className="text-xs text-muted-foreground italic">No claims scored yet.</div>
                  )}
                </div>
              </div>

              <div className="glass rounded-2xl p-5">
                <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <span className="text-amber-500">⚠️</span> Unvalidated Assumptions (0 In-Edges)
                </h3>
                <div className="space-y-3">
                  {analytics.isolated_assumptions.map((a) => (
                    <div key={a.id} className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-xl">
                      <div className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">{a.content}</div>
                      <div className="text-[9px] text-amber-500/80 mt-2 font-mono uppercase tracking-wider">Needs supporting evidence</div>
                    </div>
                  ))}
                  {analytics.isolated_assumptions.length === 0 && (
                    <div className="text-[10px] font-mono text-emerald-400 font-medium">All assumptions have supporting evidence!</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Discovery Copilot Chat */}
        <div className="glass rounded-2xl flex flex-col h-[600px] overflow-hidden">
          <div className="p-4 border-b border-white/10 glass-strong flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(255,26,26,0.8)] animate-pulse" />
              <span className="text-sm font-bold text-foreground">Discovery Copilot</span>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">GraphRAG v1.0</span>
          </div>

          {/* Chat History */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[var(--gradient-red)] text-white rounded-br-none shadow-[0_4px_12px_rgba(255,26,26,0.15)]'
                      : 'glass-strong text-foreground border border-white/10 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Cites Graph Nodes:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c) => (
                          <span
                            key={c.id}
                            className="inline-block text-[9px] font-mono bg-blue-900/20 text-blue-400 border border-blue-800/40 rounded px-2 py-0.5"
                          >
                            [{c.type}] {c.label.slice(0, 20)}...
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic font-mono pl-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Copilot searching Knowledge Graph...
              </div>
            )}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleAskCopilot} className="p-4 border-t border-white/10 glass-strong flex gap-3">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask Copilot about pricing, evidence, assumptions..."
              className="flex-1 glass-strong border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[rgba(255,26,26,0.5)] text-foreground placeholder-[var(--muted-foreground)] transition-colors"
              disabled={isAsking}
            />
            <button
              type="submit"
              disabled={isAsking || !queryInput.trim()}
              className="bg-[var(--gradient-red)] disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-transform red-glow hover:scale-[1.02] cursor-pointer"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

