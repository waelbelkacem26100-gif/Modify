'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, RotateCcw, RefreshCw, Eye, Rocket, X, Wand2, Zap,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ActivationCard from '@/components/dashboard/ActivationCard'
import { fixMode, MODE_PRESENTATION, whatChanged, beforeAfter } from '@/lib/fix-presentation'
import type { Fix } from '@/types'

type StoreMode = 'auto' | 'approval'

export default function FixesContent() {
  const [fixes, setFixes] = useState<Fix[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [rolling, setRolling] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({})
  const [shopDomain, setShopDomain] = useState<string | null>(null)
  const [mode, setMode] = useState<StoreMode>('auto')
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const fetchFixes = useCallback(async () => {
    const res = await fetch('/api/fixes/apply')
    if (res.ok) {
      const data = await res.json() as { fixes: Fix[]; shop_domain?: string }
      setFixes(data.fixes ?? [])
      setShopDomain(data.shop_domain ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchFixes() }, [fetchFixes])

  // Persisted store mode (auto vs weekly approval) — server-backed.
  useEffect(() => {
    fetch('/api/store/mode')
      .then((r) => r.ok ? r.json() : null)
      .then((d: { mode?: StoreMode } | null) => { if (d?.mode === 'auto' || d?.mode === 'approval') setMode(d.mode) })
      .catch(() => {})
  }, [])
  function changeMode(m: StoreMode) {
    setMode(m) // optimistic
    fetch('/api/store/mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: m }),
    }).catch(() => {})
  }

  function showConfirmation(title: string) {
    setConfirmation(title)
    setTimeout(() => setConfirmation((c) => (c === title ? null : c)), 6000)
  }

  function previewUrl(fix: Fix): string | null {
    if (!fix.preview_theme_id || !shopDomain) return null
    return `https://${shopDomain}/admin/themes/${fix.preview_theme_id}/editor`
  }

  async function applyFix(fix: Fix) {
    setApplying(fix.id)
    setApplyErrors((prev) => ({ ...prev, [fix.id]: '' }))
    try {
      const res = await fetch('/api/fixes/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fix.id, confirm_high_risk: fixMode(fix.risk_group) === 'approval' }),
      })
      const data = await res.json() as { error?: string; status?: string; preview_theme_id?: string }
      if (res.ok) {
        const newStatus = data.status === 'preview' ? 'preview' : 'applied'
        setFixes((prev) => prev.map((f) =>
          f.id === fix.id ? { ...f, status: newStatus, preview_theme_id: data.preview_theme_id ?? f.preview_theme_id } : f
        ))
        if (newStatus === 'applied') showConfirmation(fix.title)
      } else {
        setApplyErrors((prev) => ({ ...prev, [fix.id]: data.error ?? 'Une erreur est survenue.' }))
      }
    } finally {
      setApplying(null)
    }
  }

  async function applyAll() {
    const pending = fixes.filter((f) => f.status === 'pending' && fixMode(f.risk_group) === 'auto')
    for (const f of pending) await applyFix(f)
  }

  async function promoteFix(fix: Fix) {
    setPromoting(fix.id)
    setApplyErrors((prev) => ({ ...prev, [fix.id]: '' }))
    try {
      const res = await fetch('/api/fixes/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fix.id }),
      })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        setFixes((prev) => prev.map((f) => f.id === fix.id ? { ...f, status: 'applied' } : f))
        showConfirmation(fix.title)
      } else {
        setApplyErrors((prev) => ({ ...prev, [fix.id]: data.error ?? 'Une erreur est survenue.' }))
      }
    } finally {
      setPromoting(null)
    }
  }

  async function rollbackFix(fix: Fix) {
    setRolling(fix.id)
    try {
      const res = await fetch('/api/fixes/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fix.id }),
      })
      if (res.ok) setFixes((prev) => prev.map((f) => f.id === fix.id ? { ...f, status: 'rolled_back' } : f))
    } finally {
      setRolling(null)
    }
  }

  const totalApplied = fixes.filter((f) => f.status === 'applied').length
  const totalRecovered = fixes.filter((f) => f.status === 'applied').reduce((s, f) => s + f.impact_euros, 0)
  const hasThemeFixes = fixes.some((f) => (f.risk_group ?? 'b') !== 'a')
  const pendingAuto = fixes.filter((f) => f.status === 'pending' && fixMode(f.risk_group) === 'auto').length

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {/* Confirmation banner */}
      {confirmation && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-success text-white rounded-xl shadow-xl max-w-md">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{confirmation} appliqué — visible sur votre boutique maintenant</p>
          <button onClick={() => setConfirmation(null)} className="ml-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">Vos correctifs</h1>
        <p className="text-text-secondary text-sm">
          Chaque correctif augmente vos ventes. Une sauvegarde est créée avant toute modification.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 mb-6">
        <p className="text-text-primary font-medium text-sm mb-3">Comment Modify doit-il agir ?</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => changeMode('auto')}
            className={`text-left rounded-xl p-4 border transition-colors ${
              mode === 'auto' ? 'border-primary bg-primary/5' : 'border-border hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔄</span>
              <span className="font-medium text-text-primary text-sm">Mode automatique</span>
              {mode === 'auto' && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              Modify applique toutes les améliorations sans rien vous demander.
            </p>
          </button>

          <button
            onClick={() => changeMode('approval')}
            className={`text-left rounded-xl p-4 border transition-colors ${
              mode === 'approval' ? 'border-primary bg-primary/5' : 'border-border hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">✋</span>
              <span className="font-medium text-text-primary text-sm">Je veux approuver chaque semaine</span>
              {mode === 'approval' && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              Chaque lundi, vous recevez un email avec la liste. Vous approuvez en 1 clic.
            </p>
          </button>
        </div>

        {mode === 'auto' && pendingAuto > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-text-secondary text-xs">{pendingAuto} amélioration(s) prête(s) à appliquer.</p>
            <Button size="sm" onClick={applyAll} loading={applying !== null}>
              <Zap className="w-3.5 h-3.5" /> Tout appliquer maintenant
            </Button>
          </div>
        )}
      </div>

      {/* Activation guide for theme app blocks */}
      {hasThemeFixes && <ActivationCard />}

      {/* Summary */}
      {fixes.length > 0 && (
        <div className="bg-success/5 border border-success/20 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-syne font-bold text-lg text-text-primary">{totalApplied} correctif(s) appliqué(s)</p>
              <p className="text-text-muted text-xs">sur {fixes.length} au total</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-syne font-bold text-2xl text-success">€{totalRecovered.toLocaleString('fr-FR')}</p>
            <p className="text-text-muted text-xs">récupérés / mois</p>
          </div>
        </div>
      )}

      {/* Fix list */}
      {fixes.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Wand2 className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucun correctif pour l’instant</h3>
          <p className="text-text-secondary text-sm">Lancez une analyse de votre boutique pour générer vos correctifs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fixes.map((fix) => {
            const mInfo = MODE_PRESENTATION[fixMode(fix.risk_group)]
            const applied = fix.status === 'applied'
            return (
              <div key={fix.id} className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${mInfo.cls}`}>
                        {mInfo.emoji} {mInfo.label}
                      </span>
                      <Badge variant={fix.status as 'applied' | 'pending' | 'rolled_back' | 'failed' | 'preview'}>
                        {applied ? 'Appliqué' :
                         fix.status === 'rolled_back' ? 'Annulé' :
                         fix.status === 'failed' ? 'À réessayer' :
                         fix.status === 'preview' ? 'En attente de votre validation' : 'À venir'}
                      </Badge>
                      <span className="text-success text-sm font-semibold ml-auto flex-shrink-0">
                        +€{fix.impact_euros}/mois
                      </span>
                    </div>

                    <h3 className="font-medium text-text-primary text-sm mb-1">{fix.title}</h3>

                    {/* What changed — plain language */}
                    <p className="text-text-secondary text-xs leading-relaxed">
                      <span className="text-text-muted font-medium">Ce qui change : </span>
                      {whatChanged(fix)}
                    </p>

                    {/* Before / after for applied fixes */}
                    {applied && (() => {
                      const ba = beforeAfter(fix)
                      return (
                        <div className="mt-3 grid sm:grid-cols-2 gap-2">
                          <div className="bg-danger/5 border border-danger/15 rounded-lg p-2.5">
                            <p className="text-danger text-[11px] font-semibold uppercase tracking-wide mb-0.5">Avant</p>
                            <p className="text-text-secondary text-xs leading-snug">{ba.before}</p>
                          </div>
                          <div className="bg-success/5 border border-success/15 rounded-lg p-2.5">
                            <p className="text-success text-[11px] font-semibold uppercase tracking-wide mb-0.5">Après</p>
                            <p className="text-text-secondary text-xs leading-snug">{ba.after}</p>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Inline confirmation for applied fixes */}
                    {applied && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 border border-success/20 rounded-lg text-success text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Visible sur votre boutique maintenant
                      </div>
                    )}

                    {applyErrors[fix.id] && (
                      <p className="text-danger text-xs mt-2">{applyErrors[fix.id]}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {fix.status === 'pending' && (
                      <Button size="sm" onClick={() => applyFix(fix)} loading={applying === fix.id}>
                        <CheckCircle className="w-3.5 h-3.5" /> Appliquer
                      </Button>
                    )}
                    {fix.status === 'preview' && (
                      <>
                        {previewUrl(fix) && (
                          <a href={previewUrl(fix)!} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Aperçu
                          </a>
                        )}
                        <Button size="sm" onClick={() => promoteFix(fix)} loading={promoting === fix.id}>
                          <Rocket className="w-3.5 h-3.5" /> Valider
                        </Button>
                      </>
                    )}
                    {applied && (
                      <Button size="sm" variant="secondary" onClick={() => rollbackFix(fix)} loading={rolling === fix.id}>
                        <RotateCcw className="w-3.5 h-3.5" /> Annuler
                      </Button>
                    )}
                    {fix.status === 'failed' && (
                      <Button size="sm" variant="ghost" onClick={() => applyFix(fix)} loading={applying === fix.id}>
                        <RefreshCw className="w-3.5 h-3.5" /> Réessayer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
