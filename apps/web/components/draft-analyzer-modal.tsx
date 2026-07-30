import React, { useState } from 'react'
import { X, Sparkles, Loader2, Maximize2, Minimize2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { ContentSource } from './project-content-sources-tab'

interface Props {
  source: ContentSource
  onClose: () => void
}

export function DraftAnalyzerModal({ source, onClose }: Props) {
  const [prompt, setPrompt] = useState('Analizează acest articol și extrage principalele 3 idei pentru o audiență de antreprenori.')
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setAiResponse('')

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'seo_article',
          topic: prompt,
          brand: { name: 'Advanced Systems' }, // Or whatever project brand context is available
          stream: true,
          maxLength: 1000
        })
      })

      if (!res.ok) throw new Error('Eroare la generare')

      // Simple handling for the stream text to combine context
      // Note: The /api/ai/generate endpoint normally takes 'type' and 'topic'.
      // Here we inject the draft content as context into the prompt/topic.
      
      const streamRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'seo_article',
          topic: `TASK: ${prompt}\n\nCONTEXT (SURSĂ BRUTĂ):\n${source.content?.substring(0, 15000)}`,
          stream: false,
          maxLength: 1000
        })
      })

      const data = await streamRes.json()
      if (data.error) throw new Error(data.error)
      
      setAiResponse(data.data.content)
      
    } catch (e: any) {
      toast.error(e.message || 'Eroare la generare')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(aiResponse)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Copiat în clipboard!")
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-card w-full ${isFullscreen ? 'max-w-none h-[calc(100vh-2rem)]' : 'max-w-6xl max-h-[90vh]'} rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden transition-all duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Draft Analyzer & AI Rewriter
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Sursă: {source.name} ({source.url})</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Left: Original Draft */}
          <div className="flex flex-col border-r border-border h-full bg-background/50">
            <div className="p-3 bg-muted/20 border-b border-border font-medium text-xs text-muted-foreground uppercase tracking-wider">
              Draft Brut (Markdown Extras)
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <pre className="text-sm font-mono text-muted-foreground whitespace-pre-wrap break-words">
                {source.content || 'Niciun conținut extras.'}
              </pre>
            </div>
          </div>

          {/* Right: AI Output & Controls */}
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border bg-muted/10 space-y-3">
              <label className="text-xs font-medium text-foreground block">Prompt AI / Instrucțiuni de Rescriere</label>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full h-20 bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none custom-scrollbar"
                placeholder="Ex: Scrie o sinteză a acestui articol punând accent pe beneficiile financiare..."
              />
              <div className="flex justify-end">
                <button 
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {loading ? 'Generare...' : 'Rescrie cu AI'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-muted/20 border-b border-border flex items-center justify-between">
              <span className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
                Rezultat AI
              </span>
              {aiResponse && (
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  {copied ? 'Copiat' : 'Copiază'}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-background custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm">Analizez documentul și procesez instrucțiunile...</p>
                </div>
              ) : aiResponse ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {aiResponse.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 space-y-2">
                  <Sparkles size={32} />
                  <p className="text-sm">Rezultatul AI va apărea aici.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
