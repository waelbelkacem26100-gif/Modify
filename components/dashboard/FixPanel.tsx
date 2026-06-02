'use client'

import { useEffect, useState } from 'react'
import { X, Wand2, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { AuditResult, Fix } from '@/types'

interface FixPanelProps {
  issue: AuditResult | null
  auditId: string
  onClose: () => void
  onApplied?: (fixId: string) => void
}

export default function FixPanel({ issue, auditId, onClose, onApplied }: FixPanelProps) {
  const [fix, setFix] = useState<Fix | null>(null)
  const [generating, setGenerating] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState('')

  const isOpen = issue !== null

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Generate fix when panel opens
  useEffect(() => {
    if (!issue) {
      setFix(null)
      setApplied(false)
      setError('')
      return
    }

    setGenerating(true)
    setError('')
    setFix(null)
    setApplied(false)

    fetch('/api/fixes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit_id: auditId, issue }),
    })
      .then((r) => r.json())
      .then((data: { fix?: Fix; error?: string }) => {
        if (data.fix) {
          setFix(data.fix)
          if (data.fix.status === 'applied') setApplied(true)
        } else {
          setError(data.error ?? 'Erreur lors de la génération')
        }
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setGenerating(false))
  }, [issue, auditId])

  async function applyFix() {
    if (!fix) return

    // Group C requires explicit confirmation
    if (fix.risk_group === 'c') {
      const ok = confirm(
        '⚠️ RISQUE ÉLEVÉ\n\nCe correctif modifie la navigation, le checkout ou le layout principal.\n\nUn backup complet sera effectué avant toute modification.\nVous pourrez faire un rollback immédiat si nécessaire.\n\nConfirmer l\'application ?'
      )
      if (!ok) return
    }

    setApplying(true)
    setError('')
    try {
      const res = await fetch('/api/fixes/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fix.id, confirm_high_risk: fix.risk_group === 'c' }),
      })
      if (res.ok) {
        setApplied(true)
        onApplied?.(fix.id)
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Échec de l\'application du correctif')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 bg-black/60 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Panel */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-full max-w-xl bg-surface border-l border-border z-50 flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Correctif IA
              </span>
            </div>
            <h2 className="font-syne font-bold text-lg text-text-primary leading-tight">
              {issue?.title ?? ''}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Issue info */}
          {issue && (
            <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted uppercase tracking-wide">Impact estimé</span>
                <span className="text-warning font-semibold text-sm">€{issue.impact_euros}/mois</span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">{issue.description}</p>
              <p className="text-text-muted text-xs italic">💡 {issue.recommendation}</p>
            </div>
          )}

          {/* Loading */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-text-primary text-sm font-medium">Génération du correctif…</p>
                <p className="text-text-muted text-xs mt-1">L&apos;IA analyse le code Liquid de votre thème</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !generating && (
            <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          {/* Fix preview */}
          {fix && !generating && (
            <>
              {fix.liquid_before && fix.liquid_after ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-danger" />
                      <span className="text-xs font-medium text-danger">Avant</span>
                      {fix.file_path && (
                        <span className="text-xs text-text-muted ml-auto font-mono">
                          {fix.file_path.split('/').slice(-1)[0]}
                        </span>
                      )}
                    </div>
                    <pre className="bg-background border border-danger/20 rounded-xl p-4 text-xs text-text-secondary overflow-x-auto leading-relaxed whitespace-pre-wrap break-words">
                      {fix.liquid_before}
                    </pre>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <div className="w-8 h-px bg-border" />
                      remplacé par
                      <div className="w-8 h-px bg-border" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-xs font-medium text-success">Après</span>
                    </div>
                    <pre className="bg-background border border-success/20 rounded-xl p-4 text-xs text-text-secondary overflow-x-auto leading-relaxed whitespace-pre-wrap break-words">
                      {fix.liquid_after}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-2 border border-border rounded-xl p-4 text-center">
                  <p className="text-text-secondary text-sm">
                    Correctif généré — le code sera modifié lors de l&apos;application.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border space-y-3">
          {applied ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-success/10 border border-success/20 rounded-xl text-success">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Correctif appliqué avec succès</span>
            </div>
          ) : (
            <Button
              onClick={applyFix}
              loading={applying}
              disabled={!fix || generating}
              size="lg"
              className="w-full"
            >
              <CheckCircle className="w-4 h-4" />
              Appliquer ce correctif
            </Button>
          )}

          <a
            href="/dashboard/fixes"
            className="flex items-center justify-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Voir tous les correctifs
          </a>
        </div>
      </div>
    </>
  )
}
