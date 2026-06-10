'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ScanSearch, RefreshCw, Lock, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import FixPanel from '@/components/dashboard/FixPanel'
import SubscribeButton from '@/components/dashboard/SubscribeButton'
import { categoryPresentation, priorityPresentation } from '@/lib/fix-presentation'
import type { Audit, AuditResult } from '@/types'

const POLL_INTERVAL_MS = 3_000
const POLL_TIMEOUT_MS = 120_000
const FREE_LIMIT = 3 // problems visible without a subscription

export default function AuditPage({ isSubscribed }: { isSubscribed: boolean }) {
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatingFixes, setGeneratingFixes] = useState(false)
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<AuditResult | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const pollStartRef = useRef<number | null>(null)

  const fetchLatestAudit = useCallback(async () => {
    const res = await fetch('/api/audit/start')
    if (res.ok) {
      const data = await res.json() as { audit: Audit | null }
      if (data.audit) setAudit(data.audit)
    }
  }, [])

  useEffect(() => { fetchLatestAudit() }, [fetchLatestAudit])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      if (pollStartRef.current && Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        setPolling(false); setLoading(false); setTimedOut(true); return
      }
      const res = await fetch('/api/audit/start')
      if (!res.ok) return
      const data = await res.json() as { audit: Audit; timedOut?: boolean }
      if (data.audit?.status === 'completed') {
        setAudit(data.audit); setPolling(false); setLoading(false); setTimedOut(false)
      } else if (data.audit?.status === 'failed') {
        setAudit(data.audit); setPolling(false); setLoading(false)
        if (data.timedOut) setTimedOut(true)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [polling])

  async function startAudit() {
    setLoading(true); setError(''); setTimedOut(false)
    try {
      const res = await fetch('/api/audit/start', { method: 'POST' })
      const data = await res.json() as { audit?: Audit; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors du lancement')
      setAudit(data.audit ?? null)
      pollStartRef.current = Date.now()
      setPolling(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  async function generateAllFixes() {
    if (!audit) return
    setGeneratingFixes(true)
    try {
      const res = await fetch('/api/fixes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: audit.id }),
      })
      if (res.ok) window.location.href = '/dashboard/fixes'
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingFixes(false)
    }
  }

  const results = audit?.results ? [...audit.results].sort((a, b) => b.impact_euros - a.impact_euros) : []
  const totalLost = results.reduce((s, r) => s + r.impact_euros, 0)

  return (
    <>
      <div className="p-4 sm:p-8 max-w-3xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Analyse de votre boutique</h1>
          <p className="text-text-secondary text-sm">
            Modify détecte ce qui vous fait perdre des ventes — et combien ça vous coûte chaque mois.
          </p>
        </div>

        {/* Launch */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-syne font-semibold text-text-primary mb-1">Analyser ma boutique</h2>
              <p className="text-text-secondary text-sm">Résultats en moins de 2 minutes.</p>
            </div>
            <Button onClick={startAudit} loading={loading} size="md">
              <ScanSearch className="w-4 h-4" />
              {loading ? (audit?.status === 'running' ? 'Analyse en cours…' : 'Démarrage…') : 'Lancer l’analyse'}
            </Button>
          </div>

          {loading && audit?.status === 'running' && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-text-muted mb-2">
                <span>Analyse en cours…</span><span>max 2 min</span>
              </div>
              <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse w-3/5" />
              </div>
            </div>
          )}

          {timedOut && (
            <div className="mt-4 flex items-center justify-between p-4 bg-warning/10 border border-warning/20 rounded-xl">
              <p className="text-warning text-sm">L’analyse a pris trop de temps. Réessayez.</p>
              <button onClick={startAudit} className="flex items-center gap-1.5 text-xs text-warning hover:text-warning/80 font-medium">
                <RefreshCw className="w-3.5 h-3.5" /> Relancer
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">{error}</div>
          )}
        </div>

        {/* Results */}
        {audit?.status === 'completed' && results.length > 0 && (
          <>
            {/* Headline: total lost per month */}
            <div className="bg-danger/5 border border-danger/20 rounded-2xl p-5 mb-6 text-center">
              <p className="text-text-secondary text-sm mb-1">Votre boutique perd environ</p>
              <p className="font-syne font-bold text-3xl sm:text-4xl text-danger">
                €{totalLost.toLocaleString('fr-FR')}<span className="text-lg text-text-muted font-medium"> / mois</span>
              </p>
              <p className="text-text-muted text-xs mt-1">{results.length} problèmes détectés — Modify peut les corriger</p>
            </div>

            <div className="space-y-3 mb-6">
              {results.map((issue, idx) => {
                const cat = categoryPresentation(issue.category)
                const prio = priorityPresentation(issue.priority)
                const locked = !isSubscribed && idx >= FREE_LIMIT
                const isApplied = appliedIds.has(issue.id)

                return (
                  <div key={issue.id} className="relative">
                    <div className={`bg-surface border border-border rounded-2xl p-5 ${locked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none mt-0.5">{cat.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="font-semibold text-text-primary text-sm sm:text-base">{issue.title}</h3>
                            <span className="text-danger font-bold text-sm whitespace-nowrap">
                              €{issue.impact_euros}<span className="text-text-muted font-medium">/mois perdus</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-xs">{prio.emoji}</span>
                            <span className={`text-xs font-medium ${prio.cls}`}>{prio.label}</span>
                            <span className="text-text-muted text-xs">· {cat.label}</span>
                          </div>
                          <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">{issue.description}</p>
                          {issue.fix_available && !locked && (
                            isApplied ? (
                              <span className="inline-block mt-3 text-xs px-2.5 py-1 bg-success/10 border border-success/20 rounded-full text-success">
                                ✅ Corrigé
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedIssue(issue)}
                                className="mt-3 text-xs px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-primary hover:bg-primary/20 transition-colors font-medium"
                              >
                                Corriger ce problème →
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Unlock CTA over the first blurred card */}
                    {locked && idx === FREE_LIMIT && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-surface border border-primary/30 rounded-2xl p-5 text-center shadow-xl max-w-xs">
                          <Lock className="w-6 h-6 text-primary mx-auto mb-2" />
                          <p className="text-text-primary font-semibold text-sm mb-1">
                            {results.length - FREE_LIMIT} autres problèmes détectés
                          </p>
                          <p className="text-text-secondary text-xs mb-4">
                            Débloquez tous les problèmes et leurs correctifs.
                          </p>
                          <SubscribeButton />
                          <p className="text-text-muted text-[11px] mt-2">Voir tous les problèmes — 9€/mois</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {isSubscribed && (
              <Button onClick={generateAllFixes} loading={generatingFixes} size="lg">
                <Sparkles className="w-4 h-4" />
                Corriger tous les problèmes
              </Button>
            )}
          </>
        )}

        {audit?.status === 'failed' && !timedOut && (
          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
            <p className="text-danger font-medium mb-1">L’analyse a échoué</p>
            <p className="text-text-secondary text-sm">Vérifiez la connexion à votre boutique et réessayez.</p>
          </div>
        )}
      </div>

      <FixPanel
        issue={selectedIssue}
        auditId={audit?.id ?? ''}
        onClose={() => setSelectedIssue(null)}
        onApplied={() => { if (selectedIssue) setAppliedIds((prev) => new Set([...prev, selectedIssue.id])) }}
      />
    </>
  )
}
