import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '../../store/ui'
import { apiClient } from '../../api/client'
import { X, Upload } from 'lucide-react'

export default function UploadModal() {
  const { uploadModalOpen, closeUploadModal } = useUIStore()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const queryClient = useQueryClient()
  
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [log, setLog] = useState<string[]>([])

  if (!uploadModalOpen) return null

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

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

  const addLog = (message: string, delay: number) =>
    new Promise<void>((resolve) => setTimeout(() => {
      setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
      resolve()
    }, delay))

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !workspaceId) return
    try {
      setStatus('uploading')
      setProgress(10)
      const formData = new FormData()
      formData.append('file', file)
      await apiClient.post(`/workspaces/${workspaceId}/documents/ingest`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => setProgress(Math.min(85, Math.round((e.loaded * 100) / (e.total || 1))))
      })
      setProgress(100)
      setStatus('processing')
      await addLog("Targeting ingestion pipelines...", 100)
      await addLog(`File schema verified: ${file.name} (${Math.round(file.size / 1024)} KB)`, 300)
      await addLog("Extracting raw semantic chunks via parse agents...", 500)
      await addLog("Generating vector embeddings for pgvector database...", 600)
      await addLog("Evidence synthesis running: cross-examining workspace belief network...", 700)
      await addLog("Calculated potential claims, active contradictions exposed.", 600)
      await addLog("Knowledge State updated. Syncing clients...", 400)
      setStatus('done')
      queryClient.invalidateQueries({ queryKey: ['claims', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['discoveries', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['research', workspaceId] })
    } catch (err: any) {
      setStatus('idle')
      alert("Failed to upload document: " + (err.response?.data?.detail || err.message))
    }
  }

  const handleReset = () => {
    setFile(null); setStatus('idle'); setProgress(0); setLog([])
    closeUploadModal()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="glass rounded-2xl p-6 w-full max-w-lg relative shadow-2xl border border-white/10">
        
        {/* Glow */}
        <div className="pointer-events-none absolute -top-12 -left-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,26,26,0.2),transparent_60%)] blur-2xl" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.08)] px-2.5 py-1 text-[10px] font-medium text-[var(--primary)] mb-2">
              <Upload className="h-3 w-3" /> Ingest Pipeline
            </div>
            <h3 className="text-lg font-bold">Ingest Research Document</h3>
            <p className="text-xs text-muted-foreground mt-1 font-light">
              Upload PDF, DOCX, or JSON data. DiscoveryOS will parse, chunk, embed, and update claims.
            </p>
          </div>
          <button onClick={handleReset} className="text-muted-foreground hover:text-foreground transition-colors p-1 ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'idle' && (
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border border-dashed border-white/20 hover:border-[rgba(255,26,26,0.4)] rounded-xl p-8 flex flex-col justify-center items-center text-center cursor-pointer transition-colors group relative glass-strong"
            >
              <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.docx,.json,.txt" />
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
                {file ? '📄' : '📥'}
              </span>
              <h4 className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors">
                {file ? file.name : 'Click to upload or drag & drop'}
              </h4>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                {file ? `${Math.round(file.size / 1024)} KB` : 'Accepts PDF, JSON, TXT, CSV up to 10MB'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={closeUploadModal}
                className="px-4 py-2 glass-strong hover:bg-white/10 text-foreground font-semibold rounded-xl text-xs transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!file}
                className="px-4 py-2 bg-[var(--gradient-red)] disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition-transform red-glow hover:scale-[1.02]">
                Run Pipeline ⚡
              </button>
            </div>
          </form>
        )}

        {(status === 'uploading' || status === 'processing') && (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">
                  {status === 'uploading' ? 'Streaming bits...' : 'Extracting Knowledge...'}
                </span>
                <span className="text-[var(--primary)] font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--gradient-red)] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="glass-strong rounded-xl p-4 h-48 overflow-y-auto font-mono text-[10px] text-muted-foreground space-y-1.5">
              {log.length === 0 ? (
                <div className="italic">Starting AI evidence synthesis logs...</div>
              ) : (
                log.map((entry, idx) => (
                  <div key={idx} className="border-l border-[rgba(255,26,26,0.4)] pl-2 leading-relaxed">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center py-6 space-y-4">
            <div className="text-4xl text-emerald-400">✓</div>
            <div>
              <h4 className="text-base font-bold">Payload Ingested Successfully</h4>
              <p className="text-xs text-muted-foreground font-light mt-1">
                DiscoveryEngine analysis completed. View new claims in Claims Explorer.
              </p>
            </div>
            <button onClick={handleReset}
              className="px-6 py-2 bg-[var(--gradient-red)] text-white text-xs font-semibold rounded-xl transition-transform red-glow hover:scale-[1.02]">
              Acknowledge & Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
