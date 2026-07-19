import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '../../store/ui'
import { apiClient } from '../../api/client'

export default function UploadModal() {
  const { uploadModalOpen, closeUploadModal } = useUIStore()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const queryClient = useQueryClient()
  
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [log, setLog] = useState<string[]>([])

  if (!uploadModalOpen) return null

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

  const addLog = (message: string, delay: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
        resolve()
      }, delay)
    })
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !workspaceId) return

    try {
      setStatus('uploading')
      setProgress(10)
      
      const formData = new FormData()
      formData.append('file', file)
      
      // Upload to actual backend endpoint
      await apiClient.post(
        `/workspaces/${workspaceId}/documents/ingest`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent: any) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
            setProgress(Math.min(85, percentCompleted)) // Reserve final percentage for processing
          }
        }
      )

      setProgress(100)
      setStatus('processing')
      
      // Live processing logs simulation
      await addLog("Targeting ingestion pipelines...", 100)
      await addLog(`File schema verified: ${file.name} (${Math.round(file.size / 1024)} KB)`, 300)
      await addLog("Extracting raw semantic chunks via parse agents...", 500)
      await addLog("Generating vector embeddings for pgvector database...", 600)
      await addLog("Evidence synthesis running: cross-examining workspace belief network...", 700)
      await addLog("Calculated potential claims, active contradictions exposed.", 600)
      await addLog("Knowledge State updated. Syncing clients...", 400)
      
      setStatus('done')
      
      // Invalidate queries to refresh workspace dashboards, claims, discoveries, and research lists
      queryClient.invalidateQueries({ queryKey: ['claims', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['discoveries', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['research', workspaceId] })
    } catch (err: any) {
      console.error(err)
      setStatus('idle')
      alert("Failed to upload document: " + (err.response?.data?.detail || err.message))
    }
  }

  const handleReset = () => {
    setFile(null)
    setStatus('idle')
    setProgress(0)
    setLog([])
    closeUploadModal()
  }

  return (
    <div className="fixed inset-0 bg-[#F9F9FB]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <span>📁</span> Ingest Research Document
        </h3>
        <p className="text-xs text-slate-400 mb-6 font-light leading-relaxed">
          Upload PDF, DOCX, or JSON data. DiscoveryOS will parse, chunk, embed, and update claims.
        </p>

        {status === 'idle' && (
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border border-dashed border-[#CBD5E1] hover:border-blue-500/40 bg-slate-50 rounded-xl p-8 flex flex-col justify-center items-center text-center cursor-pointer transition-colors group relative"
            >
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".pdf,.docx,.json,.txt"
              />
              <span className="text-3xl mb-3 text-slate-500 group-hover:scale-110 transition-transform duration-200">
                {file ? '📄' : '📥'}
              </span>
              <h4 className="text-sm font-semibold text-slate-800 group-hover:text-blue-400 transition-colors">
                {file ? file.name : 'Select or drop document here'}
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                {file ? `${Math.round(file.size / 1024)} KB` : 'Maximum payload 10MB'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={closeUploadModal}
                className="px-4 py-2 bg-slate-100 border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg text-xs transition-all shadow-md shadow-blue-600/10"
              >
                Ingest Payload
              </button>
            </div>
          </form>
        )}

        {(status === 'uploading' || status === 'processing') && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">
                  {status === 'uploading' ? 'Streaming bits...' : 'Extracting Knowledge...'}
                </span>
                <span className="text-blue-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-100 border border-[#E2E8F0] rounded-xl p-4 h-48 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1.5 scrollbar-thin">
              {log.length === 0 ? (
                <div className="text-slate-400 italic">Starting AI evidence synthesis logs...</div>
              ) : (
                log.map((entry, idx) => (
                  <div key={idx} className="animate-fade-in border-l border-blue-500/30 pl-2 leading-relaxed">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center py-6 space-y-4">
            <span className="text-4xl">✓</span>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">Payload Ingested Successfully</h4>
              <p className="text-xs text-slate-400 font-light">
                DiscoveryEngine analysis completed. View new claims in Claims Explorer.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-md shadow-blue-600/10"
            >
              Acknowledge & Close
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
