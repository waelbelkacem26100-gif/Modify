'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tag, Package, RotateCcw, Sparkles, Check } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Candidate { product_id: number; title: string; price: number; suggested_price: number; discount_pct: number; no_recent_sales: boolean }
interface ActivePromo { product_id: number; original_price: number; new_price: number }
interface BundleProduct { id: number; title: string }
interface Bundle { title: string; reason: string; products: BundleProduct[] }

export default function ConversionBooster() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [active, setActive] = useState<ActivePromo[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [createdBundles, setCreatedBundles] = useState<Set<string>>(new Set())
  const [bundlesLoading, setBundlesLoading] = useState(false)

  const fetchPromos = useCallback(async () => {
    const res = await fetch('/api/promos')
    if (res.ok) {
      const d = await res.json() as { candidates: Candidate[]; active: ActivePromo[] }
      setCandidates(d.candidates ?? [])
      setActive(d.active ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPromos() }, [fetchPromos])

  async function applyAll() {
    setApplying(true)
    try {
      const res = await fetch('/api/promos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (res.ok) await fetchPromos()
    } finally { setApplying(false) }
  }

  async function revertAll() {
    if (!confirm('Annuler toutes les promos et restaurer les prix d\'origine ?')) return
    setReverting(true)
    try {
      const res = await fetch('/api/promos/revert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
      if (res.ok) await fetchPromos()
    } finally { setReverting(false) }
  }

  async function loadBundles() {
    setBundlesLoading(true)
    try {
      const res = await fetch('/api/bundles')
      if (res.ok) setBundles((await res.json() as { bundles: Bundle[] }).bundles ?? [])
    } finally { setBundlesLoading(false) }
  }

  async function createBundle(b: Bundle) {
    const res = await fetch('/api/bundles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: b.title, product_ids: b.products.map((p) => p.id) }),
    })
    if (res.ok) setCreatedBundles((prev) => new Set(prev).add(b.title))
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Tag className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-syne font-semibold text-text-primary text-sm">Conversion — promos & packs</h3>
          <p className="text-text-secondary text-xs">Remises automatiques réversibles sur les produits stagnants + packs cross-sell.</p>
        </div>
      </div>

      {/* Promos */}
      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-surface-2 border border-border rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-text-primary text-sm font-medium">
                {active.length > 0
                  ? `${active.length} produit(s) en promo`
                  : `${candidates.length} produit(s) éligible(s) à une promo −10%`}
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                {active.length > 0
                  ? 'Compare-at appliqué = vrai prix barré, réversible en un clic.'
                  : 'Produits plein tarif sans réduction affichée — priorité aux invendus.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {active.length > 0 && (
                <Button onClick={revertAll} loading={reverting} size="sm" variant="ghost">
                  <RotateCcw className="w-3.5 h-3.5" /> Annuler
                </Button>
              )}
              {candidates.length > 0 && (
                <Button onClick={applyAll} loading={applying} size="sm">
                  <Tag className="w-3.5 h-3.5" /> Appliquer (−10%)
                </Button>
              )}
            </div>
          </div>
          {candidates.length > 0 && active.length === 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {candidates.slice(0, 6).map((c) => (
                <span key={c.product_id} className="text-[11px] px-2 py-1 rounded-lg bg-background text-text-secondary">
                  {c.title.slice(0, 24)} <span className="text-text-muted line-through">€{c.price}</span> <span className="text-success">€{c.suggested_price}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bundles */}
      <div className="bg-surface-2 border border-border rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-text-secondary" />
            <p className="text-text-primary text-sm font-medium">Packs cross-sell suggérés</p>
          </div>
          {bundles.length === 0 && (
            <Button onClick={loadBundles} loading={bundlesLoading} size="sm" variant="ghost">
              <Sparkles className="w-3.5 h-3.5" /> Suggérer
            </Button>
          )}
        </div>
        {bundles.length === 0 ? (
          <p className="text-text-muted text-xs">L&apos;IA détecte les produits complémentaires et crée une collection cross-sell.</p>
        ) : (
          <div className="space-y-2 mt-1">
            {bundles.map((b) => (
              <div key={b.title} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-background">
                <div className="min-w-0">
                  <p className="text-text-primary text-xs font-medium">{b.title}</p>
                  <p className="text-text-muted text-[11px]">{b.products.map((p) => p.title).join(' + ')}</p>
                </div>
                {createdBundles.has(b.title) ? (
                  <span className="text-success text-xs flex items-center gap-1 flex-shrink-0"><Check className="w-3.5 h-3.5" /> Créé</span>
                ) : (
                  <button onClick={() => createBundle(b)} className="text-primary text-xs font-medium hover:text-primary-dark flex-shrink-0">
                    Créer la collection
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
