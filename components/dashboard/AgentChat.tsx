'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Lock, Bot, ScanSearch, CheckCircle, Loader2 } from 'lucide-react'
import SubscribeButton from '@/components/dashboard/SubscribeButton'

interface Msg { role: 'user' | 'assistant'; content: string }

// Actions inline proposées par l'agent via des marqueurs [ACTION:...] dans sa
// réponse — transformées en boutons cliquables (avec confirmation).
type InlineAction =
  | { kind: 'launch_audit' }
  | { kind: 'apply_fix'; fixId: string }
  | { kind: 'generate_content'; problemId: string }

function parseActions(reply: string): { text: string; actions: InlineAction[] } {
  const actions: InlineAction[] = []
  const text = reply
    .replace(/\[ACTION:launch_audit\]/g, () => { actions.push({ kind: 'launch_audit' }); return '' })
    .replace(/\[ACTION:apply_fix:([a-z0-9-]+)\]/gi, (_, id: string) => { actions.push({ kind: 'apply_fix', fixId: id }); return '' })
    .replace(/\[ACTION:generate_content:([a-z0-9_-]+)\]/gi, (_, id: string) => { actions.push({ kind: 'generate_content', problemId: id }); return '' })
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, actions: actions.slice(0, 2) }
}

const STARTERS = [
  'Comment augmenter mes ventes ce mois-ci ?',
  'Quels produits mettre en avant ?',
  'Qu’est-ce que Modify a fait pour ma boutique ?',
  'Pourquoi mes ventes évoluent-elles ainsi ?',
]

// Dans une mission, Mody démarre sur le concret de CETTE mission.
const MISSION_STARTERS = [
  'Par quelle étape je commence ?',
  'Adapte ce contenu à mon ton de marque',
  'Je bloque sur une étape, aide-moi',
  'Pourquoi cette mission rapporte ce montant ?',
]

interface AgentChatProps {
  isPro: boolean
  /** Chat contextualisé sur une mission Copilot (id du guide lié). */
  missionId?: string
  /** Hauteur réduite pour l'intégration dans la vue mission. */
  compact?: boolean
}

export default function AgentChat({ isPro, missionId, compact }: AgentChatProps) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [gated, setGated] = useState(false)
  const [error, setError] = useState('')
  const [runningAction, setRunningAction] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Exécute une action proposée par l'agent (après confirmation).
  async function runAction(a: InlineAction) {
    const key = a.kind === 'apply_fix' ? `fix-${a.fixId}` : a.kind === 'generate_content' ? `gen-${a.problemId}` : a.kind
    const label = a.kind === 'launch_audit'
      ? 'Lancer une analyse complète de votre boutique ?'
      : a.kind === 'generate_content'
        ? 'Lancer cette mission ? Le Copilot génère le contenu personnalisé (briefs, emails, scripts…) — environ 30 secondes.'
        : 'Appliquer ce correctif maintenant ? (sauvegarde automatique avant)'
    if (!window.confirm(label)) return
    setRunningAction(key)
    try {
      const res = a.kind === 'launch_audit'
        ? await fetch('/api/audit/start', { method: 'POST' })
        : a.kind === 'generate_content'
          ? await fetch('/api/copilot/missions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ problem_id: a.problemId }),
            })
          : await fetch('/api/fixes/apply', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fix_id: a.fixId, confirm_high_risk: false }),
          })
      const ok = res.ok
      const note = a.kind === 'launch_audit'
        ? (ok ? '✅ Analyse lancée ! Suivez la progression sur l’onglet Analyse — je te dirai ce qu’on y trouve.' : '❌ Impossible de lancer l’analyse — réessaie dans un instant.')
        : a.kind === 'generate_content'
          ? (ok ? '✅ Mission préparée ! Le contenu complet t’attend dans l’onglet Missions — chaque étape contient le texte/brief prêt à utiliser.' : '❌ La préparation de la mission a échoué — réessaie dans un instant.')
          : (ok ? '✅ Correctif appliqué et vérifié sur ta boutique. Tu peux l’annuler à tout moment depuis Corrections.' : '❌ Le correctif n’a pas pu être appliqué — regarde l’onglet Corrections pour le détail.')
      setMessages((m) => [...m, { role: 'assistant', content: note }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '❌ Une erreur réseau a interrompu l’action.' }])
    } finally {
      setRunningAction(null)
    }
  }

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
        body: JSON.stringify({ messages: next, ...(missionId ? { mission_id: missionId } : {}) }),
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
    <div className={`flex flex-col ${compact ? 'h-[440px] border border-border rounded-2xl bg-surface/40' : 'h-[calc(100vh-1px)]'} max-w-3xl mx-auto w-full`}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-syne font-bold text-text-primary">{missionId ? 'Mody — cette mission' : 'Mody, votre copilote'}</h1>
          <p className="text-text-muted text-xs">{missionId ? 'Il connaît cette mission par cœur · adapte, débloque, motive' : 'Contenu · Réputation · Vidéo & Social · Stratégie'}</p>
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
            <p className="text-text-secondary text-sm mb-5">
              {missionId ? 'Posez-moi n’importe quelle question sur cette mission.' : 'Posez-moi n’importe quelle question sur votre boutique.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {(missionId ? MISSION_STARTERS : STARTERS).map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-sm px-3 py-2.5 rounded-xl border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 transition-colors text-text-secondary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const { text, actions } = m.role === 'assistant' ? parseActions(m.content) : { text: m.content, actions: [] as InlineAction[] }
          return (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-primary'
              }`}>{text}</div>
              {actions.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {actions.map((a, j) => {
                    const key = a.kind === 'apply_fix' ? `fix-${a.fixId}` : a.kind === 'generate_content' ? `gen-${a.problemId}` : a.kind
                    const busy = runningAction === key
                    return (
                      <button key={j} onClick={() => runAction(a)} disabled={runningAction != null}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors disabled:opacity-50">
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : a.kind === 'launch_audit' ? <ScanSearch className="w-3.5 h-3.5" />
                          : a.kind === 'generate_content' ? <Sparkles className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {a.kind === 'launch_audit' ? 'Lancer l’analyse'
                          : a.kind === 'generate_content' ? 'Lancer la mission Copilot' : 'Appliquer ce correctif'}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

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
            <p className="text-text-secondary text-xs mb-4">L’assistant complet est inclus dans le plan Pro (49€/mois).</p>
            <SubscribeButton plan="pro" size="md" label="Passer à Pro — 49€/mois" />
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
