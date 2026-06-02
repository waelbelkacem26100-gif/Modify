'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wand2, CheckCircle, RotateCcw, Code2, ChevronDown, ChevronUp,
  AlertTriangle, Shield, Zap, RotateCcw as RollbackAll, RefreshCw,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Fix, RiskGroup } from '@/types'

interface FixWithExpand extends Fix { expanded?: boolean }

type Tab = 'all' | 'a' | 'b' | 'c'

const GROUP_META: Record<RiskGroup, { label: string; color: string; bg: string; border: string; icon: typeof Shield; desc: string }> = {
  a: {
    label: 'Groupe A',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
    icon: Shield,
    desc: 'Sécurisé — API produits/metafields uniquement',
  },
  b: {
    label: 'Groupe B',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    icon: Wand2,
    desc: 'Risque moyen — modification Liquid vérifiée',
  },
  c: {
    label: 'Groupe C',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    icon: AlertTriangle,
    desc: 'Risque élevé — navigation / checkout / layout',
  },
}

export default function FixesContent() {
  const [fixes, setFixes] = useState<FixWithExpand[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [rolling, setRolling] = useState<string | null>(null)
  const [rollbackAllLoading, setRollbackAllLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({})

  const fetchFixes = useCallback(async () => {
    const res = await fetch('/api/fixes/apply')
    if (res.ok) {
      const data = await res.json() as { fixes: Fix[] }
      setFixes(data.fixes ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchFixes() }, [fetchFixes])

  async function applyFix(fix: Fix) {
    const riskGroup: RiskGroup = fix.risk_group ?? 'b'
    if (riskGroup === 'c') {
      const ok = confirm(
        '⚠️ RISQUE ÉLEVÉ — Groupe C\n\nCe correctif modifie la navigation, le checkout ou le layout principal.\nUn backup est créé automatiquement avant toute modification.\n\nConfirmer ?'
      )
      if (!ok) return
    }

    setApplying(fix.id)
    setApplyErrors((prev) => ({ ...prev, [fix.id]: '' }))
    try {
      const res = await fetch('/api/fixes/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fix.id, confirm_high_risk: riskGroup === 'c' }),
      })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        setFixes((prev) => prev.map((f) => f.id === fix.id ? { ...f, status: 'applied' } : f))
      } else {
        setApplyErrors((prev) => ({ ...prev, [fix.id]: data.error ?? 'Erreur inconnue' }))
      }
    } finally {
      setApplying(null)
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
      if (res.ok) {
        setFixes((prev) => prev.map((f) => f.id === fix.id ? { ...f, status: 'rolled_back' } : f))
      }
    } finally {
      setRolling(null)
    }
  }

  async function rollbackAll() {
    const ok = confirm(
      '⚠️ ROLLBACK TOTAL\n\nCela va restaurer tous les fichiers du thème à leur état avant Modify.\nTous les correctifs appliqués seront annulés.\n\nCette action est irréversible.\nConfirmer ?'
    )
    if (!ok) return

    setRollbackAllLoading(true)
    try {
      const res = await fetch('/api/fixes/rollback-all', { method: 'POST' })
      const data = await res.json() as { rolled_back?: number; failed?: number }
      if (res.ok) {
        setFixes((prev) =>
          prev.map((f) =>
            f.status === 'applied' ? { ...f, status: 'rolled_back' } : f
          )
        )
        alert(`Rollback complet : ${data.rolled_back} fichier(s) restauré(s)${data.failed ? `, ${data.failed} échec(s)` : ''}.`)
      }
    } finally {
      setRollbackAllLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setFixes((prev) => prev.map((f) => f.id === id ? { ...f, expanded: !f.expanded } : f))
  }

  // Stats
  const appliedByGroup = {
    a: fixes.filter((f) => f.status === 'applied' && (f.risk_group ?? 'b') === 'a').length,
    b: fixes.filter((f) => f.status === 'applied' && (f.risk_group ?? 'b') === 'b').length,
    c: fixes.filter((f) => f.status === 'applied' && (f.risk_group ?? 'b') === 'c').length,
  }
  const totalApplied = fixes.filter((f) => f.status === 'applied').length
  const totalRecovered = fixes
    .filter((f) => f.status === 'applied')
    .reduce((s, f) => s + f.impact_euros, 0)

  const countByGroup = (g: RiskGroup) => fixes.filter((f) => (f.risk_group ?? 'b') === g).length

  const filtered = activeTab === 'all' ? fixes : fixes.filter((f) => (f.risk_group ?? 'b') === activeTab)

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">Correctifs</h1>
          <p className="text-text-secondary text-sm">
            Appliquez les correctifs générés par l&apos;IA — backup automatique avant chaque modification.
          </p>
        </div>
        {totalApplied > 0 && (
          <Button
            onClick={rollbackAll}
            loading={rollbackAllLoading}
            variant="danger"
            size="sm"
          >
            <RollbackAll className="w-3.5 h-3.5" />
            Rollback total
          </Button>
        )}
      </div>

      {/* Report banner */}
      {fixes.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
          <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-4">
            Rapport de session
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['a', 'b', 'c'] as RiskGroup[]).map((g) => {
              const meta = GROUP_META[g]
              return (
                <div key={g} className={`rounded-xl p-3 border ${meta.bg} ${meta.border}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                  </div>
                  <p className="font-syne font-bold text-lg text-text-primary">
                    {appliedByGroup[g]}
                  </p>
                  <p className="text-text-muted text-[10px]">appliqués</p>
                </div>
              )
            })}
            <div className="rounded-xl p-3 border bg-success/5 border-success/20">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-success">Récupéré</span>
              </div>
              <p className="font-syne font-bold text-lg text-success">
                €{totalRecovered.toLocaleString('fr-FR')}
              </p>
              <p className="text-text-muted text-[10px]">/mois</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {fixes.length > 0 && (
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 mb-5 w-fit">
          {([
            { key: 'all' as Tab, label: `Tous (${fixes.length})` },
            { key: 'a' as Tab, label: `A · ${countByGroup('a')}` },
            { key: 'b' as Tab, label: `B · ${countByGroup('b')}` },
            { key: 'c' as Tab, label: `C · ${countByGroup('c')}` },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text-secondary',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Fix list */}
      {fixes.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Wand2 className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucun correctif</h3>
          <p className="text-text-secondary text-sm">
            Lancez un audit puis cliquez sur &quot;Générer les correctifs&quot;.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((fix) => {
            const group: RiskGroup = fix.risk_group ?? 'b'
            const meta = GROUP_META[group]

            return (
              <div key={fix.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {/* Risk group badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.bg} ${meta.border} ${meta.color}`}>
                          <meta.icon className="w-3 h-3" />
                          {meta.label}
                        </span>

                        {/* Status badge */}
                        <Badge variant={fix.status as 'applied' | 'pending' | 'rolled_back'}>
                          {fix.status === 'applied' ? 'Appliqué' :
                           fix.status === 'rolled_back' ? 'Annulé' :
                           fix.status === 'failed' ? 'Échec' :
                           fix.status === 'preview' ? 'Preview' : 'En attente'}
                        </Badge>

                        {/* Verified badge */}
                        {fix.verification_status === 'verified' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-success">
                            <CheckCircle className="w-3 h-3" /> Vérifié
                          </span>
                        )}

                        <span className="text-warning text-sm font-semibold ml-auto flex-shrink-0">
                          €{fix.impact_euros}/mois
                        </span>
                      </div>

                      <h3 className="font-medium text-text-primary text-sm mb-1">{fix.title}</h3>
                      <p className="text-text-secondary text-xs leading-relaxed mb-2">{fix.description}</p>

                      {/* Group C warning */}
                      {group === 'c' && fix.status === 'pending' && (
                        <div className="flex items-start gap-2 p-2.5 bg-warning/5 border border-warning/20 rounded-lg mb-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                          <p className="text-warning text-xs leading-relaxed">
                            {meta.desc} — backup automatique créé avant application.
                          </p>
                        </div>
                      )}

                      {/* Error message */}
                      {applyErrors[fix.id] && (
                        <p className="text-danger text-xs mt-1">{applyErrors[fix.id]}</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {fix.status === 'pending' && (
                        <Button
                          size="sm"
                          variant={group === 'c' ? 'secondary' : 'primary'}
                          onClick={() => applyFix(fix)}
                          loading={applying === fix.id}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Appliquer
                        </Button>
                      )}
                      {fix.status === 'applied' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => rollbackFix(fix)}
                          loading={rolling === fix.id}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Rollback
                        </Button>
                      )}
                      {fix.status === 'failed' && (
                        <Button size="sm" variant="ghost" onClick={() => applyFix(fix)}>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Réessayer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Code preview toggle */}
                {(fix.liquid_before || fix.liquid_after) && (
                  <>
                    <button
                      onClick={() => toggleExpand(fix.id)}
                      className="w-full flex items-center justify-between px-5 py-3 border-t border-border text-text-muted hover:text-text-secondary text-xs transition-colors bg-surface-2 hover:bg-surface"
                    >
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5" />
                        Code before/after
                        {fix.file_path && (
                          <span className="font-mono text-[10px] ml-1 opacity-60">
                            {fix.file_path.split('/').slice(-1)[0]}
                          </span>
                        )}
                      </div>
                      {fix.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {fix.expanded && (
                      <div className="grid md:grid-cols-2 border-t border-border">
                        <div className="p-4 md:border-r border-border">
                          <p className="text-xs font-medium text-danger mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-danger" /> Avant
                          </p>
                          <pre className="text-xs text-text-muted overflow-x-auto bg-background rounded-lg p-3 leading-relaxed whitespace-pre-wrap break-words">
                            {fix.liquid_before ?? 'N/A'}
                          </pre>
                        </div>
                        <div className="p-4">
                          <p className="text-xs font-medium text-success mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-success" /> Après
                          </p>
                          <pre className="text-xs text-text-muted overflow-x-auto bg-background rounded-lg p-3 leading-relaxed whitespace-pre-wrap break-words">
                            {fix.liquid_after ?? 'N/A'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
