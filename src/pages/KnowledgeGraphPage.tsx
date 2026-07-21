import React, { useState, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
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
  const location = useLocation()

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
  const initialQueryProcessed = useRef(false)

  useEffect(() => {
    if (workspaceId) {
      fetchGraphData(workspaceId)
    }
  }, [workspaceId])

  useEffect(() => {
    if (location.state?.initialQuery && workspaceId && !initialQueryProcessed.current) {
      initialQueryProcessed.current = true
      submitQuery(location.state.initialQuery)
    }
  }, [location.state, workspaceId])

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

  const submitQuery = async (userQ: string) => {
    if (!userQ.trim() || !workspaceId || isAsking) return

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

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitQuery(queryInput)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🧠</span> Knowledge Graph & Discovery Copilot
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            GraphRAG-powered intelligence engine modeling relational claims, evidence, and polarities.
          </p>
        </div>

        <button
          onClick={() => workspaceId && fetchGraphData(workspaceId)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-Sync Knowledge Graph
        </button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Graph Nodes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{analytics?.total_nodes || 0}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Relational Edges</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{analytics?.total_edges || 0}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pillar Beliefs</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{analytics?.top_pillar_beliefs?.length || 0}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unvalidated Assumptions</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{analytics?.isolated_assumptions?.length || 0}</div>
        </div>
      </div>

      {/* Main Grid: Visual Graph + Copilot Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Graph Node Explorer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center justify-between">
              <span>Graph Node Explorer ({nodes.length} Nodes)</span>
              <span className="text-xs font-normal text-slate-400">Click node for details</span>
            </h2>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                Building workspace graph...
              </div>
            ) : nodes.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                No graph nodes found. Upload a document in Ingestion Hub to build nodes.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedNode?.id === node.id
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          node.node_type === 'claim'
                            ? 'bg-blue-100 text-blue-700'
                            : node.node_type === 'evidence'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {node.node_type}
                      </span>
                      {node.confidence !== undefined && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {Math.round(node.confidence * 100)}% conf
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-800 line-clamp-2">
                      {node.content || node.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Node Drawer */}
          {selectedNode && (
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md border border-slate-800 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">
                  Selected Node Inspector
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
              <div className="text-xs font-mono text-slate-400 mb-2">ID: {selectedNode.id}</div>
              <p className="text-sm font-medium text-slate-100 mb-3">{selectedNode.content || selectedNode.label}</p>

              {/* Connected Edges */}
              <div className="border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold text-slate-400 mb-2">Direct Relationships:</div>
                <div className="space-y-1">
                  {edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e, idx) => (
                      <div key={idx} className="text-xs text-slate-300 font-mono flex items-center gap-2">
                        <span className="text-blue-400 font-bold">{e.relation_type}</span>
                        <span>➔</span>
                        <span className="truncate">{e.source === selectedNode.id ? e.target : e.source}</span>
                      </div>
                    ))}
                  {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                    <div className="text-xs text-slate-500 italic">No direct edges connected yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pillar Beliefs & Isolated Assumptions Breakdown */}
          {analytics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="text-emerald-500">★</span> PageRank Pillar Beliefs
                </h3>
                <div className="space-y-2">
                  {analytics.top_pillar_beliefs.map((b) => (
                    <div key={b.id} className="p-2 bg-slate-50 rounded border border-slate-100 text-xs">
                      <div className="font-medium text-slate-800 line-clamp-1">{b.content}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">Rank Score: {b.pagerank_score}</div>
                    </div>
                  ))}
                  {analytics.top_pillar_beliefs.length === 0 && (
                    <div className="text-xs text-slate-400 italic">No claims scored yet.</div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span>⚠️</span> Unvalidated Assumptions (0 In-Edges)
                </h3>
                <div className="space-y-2">
                  {analytics.isolated_assumptions.map((a) => (
                    <div key={a.id} className="p-2 bg-amber-50/50 rounded border border-amber-100 text-xs">
                      <div className="font-medium text-amber-900 line-clamp-1">{a.content}</div>
                      <div className="text-[10px] text-amber-700 mt-1 font-mono">Needs supporting evidence</div>
                    </div>
                  ))}
                  {analytics.isolated_assumptions.length === 0 && (
                    <div className="text-xs text-emerald-600 font-medium">All assumptions have supporting evidence!</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Discovery Copilot Chat */}
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[600px] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-900">Discovery Copilot</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">GraphRAG v1.0</span>
          </div>

          {/* Chat History */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cites Graph Nodes:</div>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((c) => (
                          <span
                            key={c.id}
                            className="inline-block text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5"
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
              <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Copilot searching Knowledge Graph sub-graph...
              </div>
            )}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleAskCopilot} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask Copilot about pricing, evidence, assumptions..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
              disabled={isAsking}
            />
            <button
              type="submit"
              disabled={isAsking || !queryInput.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
