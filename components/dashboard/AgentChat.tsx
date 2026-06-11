'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Lock, Bot } from 'lucide-react'
import SubscribeButton from '@/components/dashboard/SubscribeButton'

interface Msg { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'Comment augmenter mes ventes ce mois-ci ?',
  'Quels produits mettre en avant ?',
  'Qu’est-ce que Modify a fait pour ma boutique ?',
  'Pourquoi mes ventes évoluent-elles ainsi ?',
]

export default function AgentChat({ isPro }: { isPro: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [gated, setGated] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading || gated) return
    setError('')
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const d = await res.json() as { reply?: string; error?: string; code?: string }
      if (res.ok && d.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: d.reply! }])
      } else if (d.code === 'UPGRADE_REQUIRED') {
        setGated(true)
      } else {
        setError(d.error ?? 'Une erreur est survenue.')
        setMessages((m) => m.slice(0, -1)) // drop the unanswered user message
      }
    } catch {
      setError('Connexion impossible.')
      setMessages((m) => m.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const userTurns = messages.filter((m) => m.role === 'user').length
  const remaining = isPro ? null : Math.max(0, 3 - userTurns)

  return (
    <div className="flex flex-col h-[calc(100vh-1px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-syne font-bold text-text-primary">Votre conseiller Modify</h1>
          <p className="text-text-muted text-xs">Il connaît tout de votre boutique · répond en français</p>
        </div>
        {!isPro && remaining != null && (
          <span className="ml-auto text-xs text-text-muted">{remaining} message(s) d’aperçu</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-text-secondary text-sm mb-5">Posez-moi n’importe quelle question sur votre boutique.</p>
            <div className="grid sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-sm px-3 py-2.5 rounded-xl border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 transition-colors text-text-secondary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-primary'
            }`}>{m.content}</div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl px-4 py-3 flex gap-1">
              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}

        {gated && (
          <div className="bg-surface border border-primary/30 rounded-2xl p-5 text-center max-w-md mx-auto">
            <Lock className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-text-primary font-semibold text-sm mb-1">Continuez avec votre conseiller en illimité</p>
            <p className="text-text-secondary text-xs mb-4">L’assistant complet est inclus dans le plan Pro (29€/mois).</p>
            <SubscribeButton plan="pro" size="md" label="Passer à Pro — 29€/mois" />
          </div>
        )}

        {error && <p className="text-danger text-sm text-center">{error}</p>}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-4 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || gated}
            placeholder={gated ? 'Passez à Pro pour continuer…' : 'Écrivez votre question…'}
            className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-primary/50 disabled:opacity-50"
          />
          <button type="submit" disabled={loading || gated || !input.trim()}
            className="w-11 h-11 rounded-xl bg-primary hover:bg-primary-dark text-white flex items-center justify-center disabled:opacity-50 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
