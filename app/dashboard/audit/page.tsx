'use client'

import { useState, useEffect, useCallback } from 'react'
import { ScanSearch, AlertTriangle, TrendingDown, Zap, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import FixPanel from '@/components/dashboard/FixPanel'
import type { Audit, AuditResult } from '@/types'

const categoryLabels: Record<string, string> = {
  theme: 'Thème',
  product: 'Produits',
  trust: 'Trust signals',
  speed: 'Vitesse',
  checkout: 'Checkout',
}

const categoryIcons: Record<string, typeof ScanSearch> = {
  theme: ScanSearch,
  product: TrendingDown,
  trust: AlertTriangle,
  speed: Zap,
  checkout: ChevronRight,
}

export default function AuditPage() {
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatingFixes, setGeneratingFixes] = useState(false)
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<AuditResult | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

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
      const res = await fetch('/api/audit/start')
      if (res.ok) {
        const data = await res.json() as { audit: Audit }
        if (data.audit?.status === 'completed' || data.audit?.status === 'failed') {
          setAudit(data.audit)
          setPolling(false)
          setLoading(false)
        }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [polling])

  async function startAudit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/audit/start', { method: 'POST' })
      const data = await res.json() as { audit?: Audit; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors du lancement')
      setAudit(data.audit ?? null)
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
        body: JSON.stringify({ audit_id: audit.id, generate_only: true }),
      })
      if (res.ok) window.location.href = '/dashboard/fixes'
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingFixes(false)
    }
  }

  const totalImpact = audit?.results?.reduce((s, r) => s + r.impact_euros, 0) ?? 0

  return (
    <>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Audit IA</h1>
          <p className="text-text-secondary text-sm">
            Analyse complète de votre boutique pour détecter les fuites de conversion.
          </p>
        </div>

        {/* Launch */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-syne font-semibold text-text-primary mb-1">Scanner la boutique</h2>
              <p className="text-text-secondary text-sm">
                L&apos;IA analyse 50+ points de friction en moins de 2 minutes.
              </p>
            </div>
            <Button onClick={startAudit} loading={loading} size="md">
              <ScanSearch className="w-4 h-4" />
              {loading
                ? audit?.status === 'running'
                  ? 'Analyse en cours…'
                  : 'Démarrage…'
                : 'Lancer le scan'}
            </Button>
          </div>

          {loading && audit?.status === 'running' && (
            <div className="mt-4">
              <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {audit?.status === 'completed' && audit.results && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-surface border border-border rounded-xl p-4 text-center">
                <p className="text-text-muted text-xs mb-1">Problèmes trouvés</p>
                <p className="font-syne font-bold text-2xl text-warning">{audit.results.length}</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 text-center">
                <p className="text-text-muted text-xs mb-1">Impact potentiel</p>
                <p className="font-syne font-bold text-2xl text-primary">
                  €{totalImpact.toLocaleString('fr-FR')}
                </p>
                <p className="text-text-muted text-xs">/mois</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 text-center">
                <p className="text-text-muted text-xs mb-1">Correctifs dispo.</p>
                <p className="font-syne font-bold text-2xl text-success">
                  {audit.results.filter((r) => r.fix_available).length}
                </p>
              </div>
            </div>

            {/* Issues list */}
            <div className="space-y-3 mb-6">
              {audit.results
                .sort((a, b) => b.impact_euros - a.impact_euros)
                .map((issue: AuditResult) => {
                  const Icon = categoryIcons[issue.category] ?? ScanSearch
                  const isApplied = appliedIds.has(issue.id)

                  return (
                    <div
                      key={issue.id}
                      className="bg-surface border border-border rounded-2xl p-5 hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 bg-surface-2 border border-border rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <h3 className="font-medium text-text-primary text-sm">{issue.title}</h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={issue.priority}>{issue.priority}</Badge>
                              <span className="text-warning text-sm font-semibold whitespace-nowrap">
                                €{issue.impact_euros}/mois
                              </span>
                            </div>
                          </div>
                          <p className="text-text-secondary text-xs leading-relaxed mb-2">
                            {issue.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 bg-surface-2 border border-border rounded-full text-text-muted">
                              {categoryLabels[issue.category] ?? issue.category}
                            </span>
                            {issue.fix_available && (
                              isApplied ? (
                                <span className="text-xs px-2 py-0.5 bg-success/10 border border-success/20 rounded-full text-success">
                                  ✓ Appliqué
                                </span>
                              ) : (
                                <button
                                  onClick={() => setSelectedIssue(issue)}
                                  className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-full text-primary hover:bg-primary/20 hover:border-primary/50 transition-colors cursor-pointer"
                                >
                                  Voir le correctif →
                                </button>
                              )
                            )}
                          </div>
                          <p className="text-text-muted text-xs mt-2 italic">
                            💡 {issue.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            <Button onClick={generateAllFixes} loading={generatingFixes} size="lg">
              <Zap className="w-4 h-4" />
              Générer tous les correctifs
            </Button>
          </>
        )}

        {audit?.status === 'failed' && (
          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
            <p className="text-danger font-medium mb-1">Le scan a échoué</p>
            <p className="text-text-secondary text-sm">Vérifiez la connexion Shopify et réessayez.</p>
          </div>
        )}
      </div>

      {/* Side panel */}
      <FixPanel
        issue={selectedIssue}
        auditId={audit?.id ?? ''}
        onClose={() => setSelectedIssue(null)}
        onApplied={(fixId) => {
          if (selectedIssue) {
            setAppliedIds((prev) => new Set([...prev, selectedIssue.id]))
          }
        }}
      />
    </>
  )
}
