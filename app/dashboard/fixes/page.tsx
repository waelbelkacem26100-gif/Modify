'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wand2, CheckCircle, RotateCcw, Code2, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Fix } from '@/types'

interface FixWithExpand extends Fix {
  expanded?: boolean
}

export default function FixesPage() {
  const [fixes, setFixes] = useState<FixWithExpand[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [rolling, setRolling] = useState<string | null>(null)

  const fetchFixes = useCallback(async () => {
    const res = await fetch('/api/fixes/apply')
    if (res.ok) {
      const data = await res.json() as { fixes: Fix[] }
      setFixes(data.fixes ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFixes()
  }, [fetchFixes])

  async function applyFix(fixId: string) {
    setApplying(fixId)
    try {
      const res = await fetch('/api/fixes/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fixId }),
      })
      if (res.ok) {
        setFixes((prev) =>
          prev.map((f) => (f.id === fixId ? { ...f, status: 'applied' } : f))
        )
      }
    } finally {
      setApplying(null)
    }
  }

  async function rollbackFix(fixId: string) {
    setRolling(fixId)
    try {
      const res = await fetch('/api/fixes/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fixId }),
      })
      if (res.ok) {
        setFixes((prev) =>
          prev.map((f) => (f.id === fixId ? { ...f, status: 'rolled_back' } : f))
        )
      }
    } finally {
      setRolling(null)
    }
  }

  function toggleExpand(fixId: string) {
    setFixes((prev) =>
      prev.map((f) => (f.id === fixId ? { ...f, expanded: !f.expanded } : f))
    )
  }

  const appliedCount = fixes.filter((f) => f.status === 'applied').length
  const totalImpact = fixes
    .filter((f) => f.status === 'applied')
    .reduce((s, f) => s + f.impact_euros, 0)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Correctifs</h1>
        <p className="text-text-secondary text-sm">
          Appliquez les correctifs générés par l&apos;IA avec preview before/after et rollback instantané.
        </p>
      </div>

      {/* Summary */}
      {fixes.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 text-center">
            <p className="text-text-muted text-[10px] sm:text-xs mb-1">Total</p>
            <p className="font-syne font-bold text-xl sm:text-2xl text-text-primary">{fixes.length}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 text-center">
            <p className="text-text-muted text-[10px] sm:text-xs mb-1">Appliqués</p>
            <p className="font-syne font-bold text-xl sm:text-2xl text-success">{appliedCount}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 text-center">
            <p className="text-text-muted text-[10px] sm:text-xs mb-1">Récupérés</p>
            <p className="font-syne font-bold text-xl sm:text-2xl text-primary">
              €{totalImpact.toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      )}

      {/* Fixes */}
      {fixes.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Wand2 className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucun correctif</h3>
          <p className="text-text-secondary text-sm">
            Lancez un audit puis cliquez sur &quot;Générer les correctifs&quot; pour voir les correctifs ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fixes.map((fix) => (
            <div
              key={fix.id}
              className="bg-surface border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <Badge variant={fix.status}>{fix.status === 'applied' ? 'Appliqué' : fix.status === 'rolled_back' ? 'Annulé' : 'En attente'}</Badge>
                      <span className="text-warning text-sm font-semibold">
                        €{fix.impact_euros}/mois
                      </span>
                    </div>
                    <h3 className="font-medium text-text-primary text-sm mb-1">{fix.title}</h3>
                    <p className="text-text-secondary text-xs leading-relaxed">{fix.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {fix.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => applyFix(fix.id)}
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
                        onClick={() => rollbackFix(fix.id)}
                        loading={rolling === fix.id}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Rollback
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
                      Voir le code before/after
                    </div>
                    {fix.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {fix.expanded && (
                    <div className="grid md:grid-cols-2 border-t border-border">
                      <div className="p-4 border-r border-border">
                        <p className="text-xs font-medium text-danger mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-danger inline-block" />
                          Avant
                        </p>
                        <pre className="text-xs text-text-muted overflow-x-auto bg-background rounded-lg p-3 leading-relaxed">
                          {fix.liquid_before ?? 'N/A'}
                        </pre>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-medium text-success mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-success inline-block" />
                          Après
                        </p>
                        <pre className="text-xs text-text-muted overflow-x-auto bg-background rounded-lg p-3 leading-relaxed">
                          {fix.liquid_after ?? 'N/A'}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
