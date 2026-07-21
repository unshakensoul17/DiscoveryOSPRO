import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import { useCreateClaim } from '../api/hooks'
import { useWorkspaceStore } from '../store/workspace'
import { useAuthStore } from '../store/auth'

interface IngestedDoc {
  id: string
  title: string
  file_size: number
  file_type: string
  created_at: string
}

export default function IngestionPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const queryClient = useQueryClient()
  const { workspaces } = useWorkspaceStore()
  const createClaimMutation = useCreateClaim(workspaceId || '')

  // File Upload States
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  
  // Documents List
  const [docsList, setDocsList] = useState<IngestedDoc[]>([])
  const [docsLoading, setDocsLoading] = useState(false)

  // Insight Hypothesis States
  const [claimContent, setClaimContent] = useState('')
  const [claimType, setClaimType] = useState('strategic_belief')
  const [claimConfidence, setClaimConfidence] = useState(0.8)
  const [selectedWsId, setSelectedWsId] = useState(workspaceId || '')
  const [claimStatus, setClaimStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (workspaceId) {
      setSelectedWsId(workspaceId)
      fetchDocuments(workspaceId)
    }
  }, [workspaceId])

  const fetchDocuments = async (wsId: string) => {
    setDocsLoading(true)
    try {
      const { data } = await apiClient.get<any>(`/workspaces/${wsId}/documents`)
      setDocsList(data.data || [])
    } catch (err) {
      console.error('Failed to load documents list', err)
    } finally {
      setDocsLoading(false)
    }
  }

  const addLog = (message: string, delay: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
        resolve()
      }, delay)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !workspaceId) return

    try {
      setUploadStatus('uploading')
      setLogs([])
      setProgress(15)
      await addLog(`Initializing connection to ingestion pipeline...`, 300)
      setProgress(35)
      await addLog(`Uploading file: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`, 400)
      
      const formData = new FormData()
      formData.append('file', file)

      setProgress(60)
      const response = await apiClient.post<any>(
        `/workspaces/${workspaceId}/documents/ingest`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      
      setUploadStatus('processing')
      setProgress(75)
      await addLog(`Document dispatched to reasoning engine pipeline. ID: ${response.data.id}`, 300)
      await addLog(`Celery synthesis worker analyzing assumptions, contradictions, and evidence...`, 300)
      
      // Stream real-time document processing progress via SSE
      const docId = response.data.id
      await addLog(`Connecting to real-time synthesis SSE stream...`, 200)

      const token = useAuthStore.getState().tokens?.access_token
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1'
      const streamUrl = `${baseUrl}/workspaces/${workspaceId}/documents/${docId}/stream`

      let isDone = false
      try {
        const streamResponse = await fetch(streamUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (streamResponse.ok && streamResponse.body) {
          const reader = streamResponse.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          while (!isDone) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const dataMatch = line.match(/^data:\s*(.+)$/m)
              if (dataMatch) {
                try {
                  const data = JSON.parse(dataMatch[1])
                  if (data.progress !== undefined) {
                    setProgress(Math.max(75, data.progress))
                  }
                  if (data.is_done) {
                    isDone = true
                    const cCount = data.claims_count || 0
                    const eCount = data.evidence_count || 0
                    await addLog(`Analysis complete: Extracted ${cCount} claims and ${eCount} evidence records.`, 100)
                    break
                  }
                } catch {
                  // ignore JSON parse error on heartbeat comments
                }
              }
            }
          }
        }
      } catch (streamErr) {
        console.warn('SSE stream fallback to status check:', streamErr)
      }

      // Fallback status check if SSE stream disconnected early
      if (!isDone) {
        try {
          const statusRes = await apiClient.get<any>(`/workspaces/${workspaceId}/documents/${docId}/status`)
          if (statusRes.data.is_done) {
            const cCount = statusRes.data.claims_count
            const eCount = statusRes.data.evidence_count
            await addLog(`Analysis complete: Extracted ${cCount} claims and ${eCount} evidence records.`, 100)
          }
        } catch {}
      }

      setProgress(100)
      setUploadStatus('done')
      await addLog(`Success: Evidence extraction complete! Dashboard state updated.`, 300)
      
      setFile(null)
      fetchDocuments(workspaceId)
      
      // Invalidate claims and discoveries queries to update UI
      queryClient.invalidateQueries({ queryKey: ['claims', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['discoveries', workspaceId] })
    } catch (err: any) {
      setUploadStatus('error')
      await addLog(`Error during ingestion: ${err?.message || 'Unknown network error'}`, 100)
    }
  }

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claimContent || !selectedWsId) return

    setClaimStatus('saving')
    try {
      // If we are creating it for another workspace than the current url workspace
      const targetWsId = selectedWsId
      const targetMutation = targetWsId === workspaceId ? createClaimMutation : null
      
      if (targetMutation) {
        await targetMutation.mutateAsync({
          content: claimContent,
          type: claimType,
          confidence: claimConfidence,
        })
      } else {
        await apiClient.post(`/workspaces/${targetWsId}/claims`, {
          content: claimContent,
          type: claimType,
          confidence: claimConfidence,
        })
      }
      
      setClaimContent('')
      setClaimStatus('success')
      setTimeout(() => setClaimStatus('idle'), 3000)
      
      if (targetWsId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['claims', workspaceId] })
      }
    } catch (err) {
      console.warn('API save failed:', err)
      setClaimStatus('error')
      setTimeout(() => setClaimStatus('idle'), 3000)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const inputClass = "w-full glass-strong rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[rgba(255,26,26,0.5)] transition-colors"

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-1">
          Workspace Operations
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-glow" style={{ background: 'var(--gradient-red)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Ingestion & Pipelines
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5 font-light">
          Upload unstructured research documents and inject strategic hypotheses to drive the discovery engine.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: File Ingestion */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-bold mb-1 flex items-center gap-2">
              <span>📥</span> Ingest Unstructured Feedback
            </h2>
            <p className="text-muted-foreground text-xs mb-4 font-light leading-relaxed">
              Drop transcripts, notes, or research documents here to extract pain points and evidence.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  file 
                    ? 'border-[rgba(255,26,26,0.5)] bg-[rgba(255,26,26,0.05)]'
                    : 'border-white/15 hover:border-[rgba(255,26,26,0.3)] bg-white/[0.03]'
                }`}
              >
                <input type="file" id="doc-file" onChange={handleFileChange} className="hidden" accept=".txt,.json,.pdf,.csv" />
                <label htmlFor="doc-file" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className={`w-10 h-10 rounded-full glass-strong flex items-center justify-center transition-colors ${file ? 'text-[var(--primary)]' : 'text-muted-foreground'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  {file ? (
                    <div className="text-center">
                      <span className="text-xs font-semibold text-[var(--primary)] block truncate max-w-xs">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground block mt-1">({formatBytes(file.size)})</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-xs font-semibold block">Click to upload or drag & drop</span>
                      <span className="text-[10px] text-muted-foreground block mt-1">Accepts PDF, JSON, TXT, CSV up to 10MB</span>
                    </div>
                  )}
                </label>
              </div>

              {uploadStatus !== 'idle' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-muted-foreground capitalize">Status: {uploadStatus}</span>
                    <span className="text-[var(--primary)]">{progress}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[var(--gradient-red)] h-full transition-all duration-350 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {logs.length > 0 && (
                <div className="glass-strong rounded-xl p-3 font-mono text-[9px] text-muted-foreground max-h-32 overflow-y-auto space-y-1">
                  {logs.map((logStr, idx) => (
                    <div key={idx} className={logStr.includes('Error') ? 'text-[var(--primary)]' : logStr.includes('Success') ? 'text-emerald-400' : ''}>
                      {logStr}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                {file && (
                  <button type="button" onClick={() => { setFile(null); setUploadStatus('idle'); setLogs([]); }}
                    className="px-3.5 py-2 glass-strong hover:bg-white/10 text-muted-foreground font-semibold rounded-xl text-xs transition-colors">
                    Clear File
                  </button>
                )}
                <button type="submit" disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'processing'}
                  className="px-4 py-2 bg-[var(--gradient-red)] disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition-transform red-glow hover:scale-[1.02]">
                  {uploadStatus === 'uploading' ? 'Uploading...' : uploadStatus === 'processing' ? 'Processing...' : 'Run Pipeline ⚡'}
                </button>
              </div>
            </form>
          </div>

          {/* Documents History */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span>🗂️</span> Ingested Documents History
            </h2>
            {docsLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-mono">Loading ingestion history...</div>
            ) : docsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-white/10 rounded-xl">
                No documents ingested yet in this workspace.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                      <th className="pb-2 font-semibold">Title</th>
                      <th className="pb-2 font-semibold">Size</th>
                      <th className="pb-2 font-semibold">Format</th>
                      <th className="pb-2 font-semibold">Date Ingested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {docsList.map((doc) => (
                      <tr key={doc.id} className="text-xs hover:bg-white/5 transition-colors">
                        <td className="py-2.5 pr-4 font-semibold truncate max-w-[200px]" title={doc.title}>{doc.title}</td>
                        <td className="py-2.5 text-muted-foreground font-mono text-[10px]">{formatBytes(doc.file_size)}</td>
                        <td className="py-2.5 text-muted-foreground font-mono text-[10px] uppercase">{doc.file_type.split('/')[1] || 'TXT'}</td>
                        <td className="py-2.5 text-muted-foreground font-mono text-[10px]">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Hypothesis Injection */}
        <div className="lg:col-span-5">
          <div className="glass rounded-2xl p-5 h-full">
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.08)] px-2.5 py-1 text-[9px] font-mono text-[var(--primary)] uppercase tracking-wider">
                Hypothesis Pipeline
              </span>
            </div>
            <h2 className="text-sm font-bold mb-1">➕ Inject Hypothesis Insight</h2>
            <p className="text-muted-foreground text-xs mb-5 font-light leading-relaxed">
              Add user beliefs, metrics, and core assumptions. The agent will compare these hypotheses against incoming unstructured evidence.
            </p>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
                  Select Workspace Target
                </label>
                <select value={selectedWsId} onChange={(e) => setSelectedWsId(e.target.value)} className={inputClass}>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name} {ws.id === workspaceId ? '(Current)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
                  Statement Content
                </label>
                <textarea value={claimContent} onChange={(e) => setClaimContent(e.target.value)} rows={4}
                  className={`${inputClass} resize-none h-24`}
                  placeholder="e.g. SMB users find the pricing interface confusing, leading to churn..." required />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
                  Hypothesis Claim Type
                </label>
                <select value={claimType} onChange={(e) => setClaimType(e.target.value)} className={inputClass}>
                  <option value="strategic_belief">Strategic Belief</option>
                  <option value="assumption">Assumption</option>
                  <option value="metric">Metric</option>
                  <option value="operational_fact">Operational Fact</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 font-mono text-[10px]">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider">Prior Confidence</span>
                  <span className="text-[var(--primary)] font-semibold">{Math.round(claimConfidence * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={claimConfidence}
                  onChange={(e) => setClaimConfidence(parseFloat(e.target.value))}
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-red-500"
                  style={{ background: `linear-gradient(to right, var(--primary) ${claimConfidence * 100}%, rgba(255,255,255,0.1) ${claimConfidence * 100}%)` }}
                />
              </div>

              {claimStatus === 'success' && (
                <div className="p-3 bg-emerald-400/10 border border-emerald-400/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <span>✓</span> Hypothesis injected successfully into the pipeline!
                </div>
              )}
              {claimStatus === 'error' && (
                <div className="p-3 bg-[rgba(255,26,26,0.1)] border border-[rgba(255,26,26,0.35)] rounded-xl text-[var(--primary)] text-xs flex items-center gap-2">
                  <span>✗</span> Ingestion pipeline failed to save hypothesis.
                </div>
              )}

              <div className="pt-3 border-t border-white/10">
                <button type="submit" disabled={claimStatus === 'saving' || !claimContent.trim()}
                  className="w-full py-2.5 bg-[var(--gradient-red)] disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition-transform red-glow hover:scale-[1.01] flex items-center justify-center gap-1.5">
                  {claimStatus === 'saving' ? 'Injecting...' : 'Inject Hypothesis 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
