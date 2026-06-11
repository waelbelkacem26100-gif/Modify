'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, TrendingUp, Lock } from 'lucide-react'
import Button from '@/components/ui/Button'
import SubscribeButton from '@/components/dashboard/SubscribeButton'
import type { PlanId } from '@/lib/pricing'
import type { WinningProduct } from '@/types'

const SCORE = {
  fire: { emoji: '🔥', label: 'Très fort', cls: 'text-danger bg-danger/10 border-danger/20' },
  good: { emoji: '⭐', label: 'Bon', cls: 'text-warning bg-warning/10 border-warning/20' },
  watch: { emoji: '📈', label: 'À surveiller', cls: 'text-success bg-success/10 border-success/20' },
} as const

export default function WinningProductsFeed() {
  const [products, setProducts] = useState<WinningProduct[]>([])
  const [plan, setPlan] = useState<PlanId>('free')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/products/winning')
    if (res.ok) {
      const d = await res.json() as { products: WinningProduct[]; plan: PlanId }
      setProducts(d.products ?? [])
      setPlan(d.plan ?? 'free')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function refresh() {
    setRefreshing(true); setError('')
    try {
      const res = await fetch('/api/products/winning', { method: 'POST' })
      const d = await res.json() as { error?: string }
      if (res.ok) await load()
      else setError(d.error ?? 'La recherche a échoué.')
    } finally {
      setRefreshing(false)
    }
  }

  const cadence = plan === 'pro' ? 'chaque jour' : plan === 'starter' ? '5 par semaine' : 'aperçu gratuit'

  if (loading) {
    return (
      <div className="p-8 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" /> Produits gagnants
          </h1>
          <p className="text-text-secondary text-sm">
            Repérés pour votre boutique d’après les tendances Google, Amazon et TikTok — {cadence}.
          </p>
        </div>
        <Button size="sm" onClick={refresh} loading={refreshing}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </Button>
      </div>

      {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">{error}</div>}

      {/* Upgrade nudge for non-pro */}
      {plan !== 'pro' && (
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap p-4 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-text-secondary text-sm">
              {plan === 'free'
                ? 'Passez à Starter (9€) pour 5 produits/semaine, ou Pro (29€) pour des produits gagnants chaque jour.'
                : 'Passez à Pro (29€) pour de nouveaux produits gagnants chaque jour.'}
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <SubscribeButton plan="pro" size="sm" label="Passer à Pro" />
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Sparkles className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucun produit gagnant pour l’instant</h3>
          <p className="text-text-secondary text-sm mb-5">Cliquez sur « Actualiser » pour lancer la recherche de tendances.</p>
          <Button onClick={refresh} loading={refreshing}><Sparkles className="w-4 h-4" /> Trouver des produits gagnants</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const s = SCORE[p.score] ?? SCORE.good
            return (
              <div key={p.id} className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-text-primary text-sm sm:text-base">{p.name}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${s.cls}`}>
                    {s.emoji} {s.label}
                  </span>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-3">{p.why}</p>
                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <div>
                    <span className="text-text-muted text-xs">Prix conseillé</span>
                    <p className="font-syne font-bold text-text-primary">{p.recommended_price_eur}€</p>
                  </div>
                  {p.margin_pct != null && (
                    <div>
                      <span className="text-text-muted text-xs">Marge estimée</span>
                      <p className="font-syne font-bold text-success">~{p.margin_pct}%</p>
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    {(p.sources ?? []).map((src) => (
                      <span key={src} className="text-[10px] px-2 py-0.5 bg-surface-2 border border-border rounded-full text-text-muted">{src}</span>
                    ))}
                  </div>
                </div>
                {p.category && <p className="text-text-muted text-[11px] mt-2">{p.category} · {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
