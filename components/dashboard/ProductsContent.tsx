'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Wand2,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Search,
  Zap,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import ImageOptimizer from '@/components/dashboard/ImageOptimizer'
import ConversionBooster from '@/components/dashboard/ConversionBooster'
import { computeProductScore } from '@/lib/conversion-score'
import type { ShopifyProduct } from '@/lib/shopify'
import type { ProductDescriptionResult } from '@/lib/anthropic'

interface ProductWithStatus extends ShopifyProduct {
  hasDescription: boolean
}

interface GeneratedContent extends ProductDescriptionResult {
  full_html: string
}

type ProductStatus = 'idle' | 'generating' | 'generated' | 'applying' | 'applied' | 'error'

interface ProductState {
  status: ProductStatus
  generated: GeneratedContent | null
  expanded: boolean
  error: string
}

function defaultState(): ProductState {
  return { status: 'idle', generated: null, expanded: false, error: '' }
}

export default function ProductsContent() {
  const [products, setProducts] = useState<ProductWithStatus[]>([])
  const [shopDomain, setShopDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [states, setStates] = useState<Record<number, ProductState>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [search, setSearch] = useState('')

  const setState = useCallback(
    (productId: number, patch: Partial<ProductState>) => {
      setStates((prev) => ({
        ...prev,
        [productId]: { ...(prev[productId] ?? defaultState()), ...patch },
      }))
    },
    []
  )

  useEffect(() => {
    fetch('/api/products/list')
      .then((r) => r.json())
      .then((data: { products: ProductWithStatus[]; shopDomain: string }) => {
        setProducts(data.products ?? [])
        setShopDomain(data.shopDomain ?? '')
        const initial: Record<number, ProductState> = {}
        data.products?.forEach((p) => { initial[p.id] = defaultState() })
        setStates(initial)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function generateOne(product: ProductWithStatus) {
    setState(product.id, { status: 'generating', error: '', generated: null })
    try {
      const res = await fetch('/api/products/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      })
      const data = await res.json() as GeneratedContent & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur génération')
      setState(product.id, { status: 'generated', generated: data, expanded: true })
    } catch (e) {
      setState(product.id, { status: 'error', error: e instanceof Error ? e.message : 'Erreur' })
    }
  }

  async function applyOne(product: ProductWithStatus) {
    const st = states[product.id]
    if (!st?.generated) return
    setState(product.id, { status: 'applying' })
    try {
      const res = await fetch('/api/products/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          full_html: st.generated.full_html,
          seo_title: st.generated.seo_title,
          meta_description: st.generated.meta_description,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erreur application')
      }
      setState(product.id, { status: 'applied' })
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, hasDescription: true, body_html: st.generated!.full_html } : p
        )
      )
    } catch (e) {
      setState(product.id, {
        status: 'error',
        error: e instanceof Error ? e.message : 'Erreur application',
      })
    }
  }

  async function generateAllMissing() {
    const missing = products.filter((p) => !p.hasDescription && states[p.id]?.status === 'idle')
    if (missing.length === 0) return

    if (!confirm(`Générer et appliquer automatiquement les descriptions pour ${missing.length} produit(s) sans description ?`)) return

    setGeneratingAll(true)
    for (const product of missing) {
      setState(product.id, { status: 'generating', error: '', generated: null })
      try {
        const res = await fetch('/api/products/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product }),
        })
        const data = await res.json() as GeneratedContent & { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Erreur')

        setState(product.id, { status: 'applying', generated: data })

        const applyRes = await fetch('/api/products/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            full_html: data.full_html,
            seo_title: data.seo_title,
            meta_description: data.meta_description,
          }),
        })
        if (!applyRes.ok) throw new Error('Erreur application Shopify')

        setState(product.id, { status: 'applied', generated: data })
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, hasDescription: true, body_html: data.full_html } : p
          )
        )
      } catch (e) {
        setState(product.id, {
          status: 'error',
          error: e instanceof Error ? e.message : 'Erreur',
        })
      }
      // Small delay to avoid Claude rate limits
      await new Promise((r) => setTimeout(r, 500))
    }
    setGeneratingAll(false)
  }

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  const missingCount = products.filter((p) => !p.hasDescription).length
  const appliedCount = Object.values(states).filter((s) => s.status === 'applied').length

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">
          Descriptions produits
        </h1>
        <p className="text-text-secondary text-sm">
          Génère des fiches produit haute conversion avec l&apos;IA — description, bullets SEO, meta.
        </p>
      </div>

      {/* Stats + batch action */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-surface border border-border rounded-xl px-4 py-2.5">
            <p className="text-text-muted text-xs">Total produits</p>
            <p className="font-syne font-bold text-lg text-text-primary">{products.length}</p>
          </div>
          <div className="bg-surface border border-warning/20 rounded-xl px-4 py-2.5">
            <p className="text-text-muted text-xs">Sans description</p>
            <p className="font-syne font-bold text-lg text-warning">{missingCount}</p>
          </div>
          <div className="bg-surface border border-success/20 rounded-xl px-4 py-2.5">
            <p className="text-text-muted text-xs">Mis à jour</p>
            <p className="font-syne font-bold text-lg text-success">{appliedCount}</p>
          </div>
        </div>

        {missingCount > 0 && (
          <Button
            onClick={generateAllMissing}
            loading={generatingAll}
            variant="secondary"
            size="md"
            className="sm:ml-auto"
          >
            <Zap className="w-4 h-4" />
            Générer tout ({missingCount})
          </Button>
        )}
      </div>

      {/* Automatic image compression (Sharp) */}
      <ImageOptimizer />

      {/* Conversion booster — promos & cross-sell bundles */}
      <ConversionBooster />

      {/* Search */}
      <div className="flex items-center gap-2.5 bg-surface border border-border rounded-xl px-3 py-2.5 mb-5">
        <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Package className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucun produit</h3>
          <p className="text-text-secondary text-sm">
            Connectez votre boutique Shopify et ajoutez des produits pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              state={states[product.id] ?? defaultState()}
              shopDomain={shopDomain}
              onGenerate={() => generateOne(product)}
              onApply={() => applyOne(product)}
              onToggle={() =>
                setState(product.id, { expanded: !(states[product.id]?.expanded ?? false) })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: ProductWithStatus
  state: ProductState
  shopDomain: string
  onGenerate: () => void
  onApply: () => void
  onToggle: () => void
}

function ProductCard({ product, state, shopDomain, onGenerate, onApply, onToggle }: ProductCardProps) {
  const thumbnail = product.images?.[0]?.src
  const shopifyAdminUrl = `https://${shopDomain}/admin/products/${product.id}`
  const conv = computeProductScore(product)
  const convColor = conv.score >= 8 ? 'text-success bg-success/10 border-success/20'
    : conv.score >= 5 ? 'text-warning bg-warning/10 border-warning/20'
    : 'text-danger bg-danger/10 border-danger/20'

  const statusBadge = product.hasDescription || state.status === 'applied' ? (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-success/10 border border-success/20 rounded-full text-xs text-success font-medium">
      <CheckCircle className="w-3 h-3" /> Description complète
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-warning/10 border border-warning/20 rounded-full text-xs text-warning font-medium">
      <Package className="w-3 h-3" /> À rédiger
    </span>
  )

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Product row */}
      <div className="flex items-start gap-4 p-5">
        {/* Thumbnail */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-surface-2 border border-border flex-shrink-0">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-text-muted" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-medium text-text-primary text-sm leading-snug line-clamp-2">
              {product.title}
            </h3>
            <a
              href={shopifyAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text-secondary transition-colors flex-shrink-0 mt-0.5"
              title="Voir sur Shopify"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${convColor}`}
              title={conv.reasons.length ? conv.reasons.join(' · ') : 'Fiche produit optimale'}
            >
              Conv. {conv.score}/10
            </span>
            {statusBadge}
            {product.product_type && (
              <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-border">
                {product.product_type}
              </span>
            )}
            {product.variants?.length > 0 && (
              <span className="text-xs text-text-muted">
                {product.variants.length} variante{product.variants.length > 1 ? 's' : ''} · à partir de {
                  Math.min(...product.variants.map((v) => parseFloat(v.price))).toLocaleString('fr-FR')
                }€
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {state.status === 'idle' && (
              <Button onClick={onGenerate} size="sm" variant={product.hasDescription ? 'ghost' : 'primary'}>
                <Wand2 className="w-3.5 h-3.5" />
                {product.hasDescription ? 'Regénérer' : 'Générer la description'}
              </Button>
            )}
            {state.status === 'generating' && (
              <div className="flex items-center gap-2 text-primary text-xs font-medium">
                <div className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
                Génération en cours…
              </div>
            )}
            {state.status === 'generated' && (
              <>
                <Button onClick={onApply} size="sm">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Appliquer sur Shopify
                </Button>
                <Button onClick={onGenerate} size="sm" variant="ghost">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regénérer
                </Button>
              </>
            )}
            {state.status === 'applying' && (
              <div className="flex items-center gap-2 text-primary text-xs font-medium">
                <div className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
                Application sur Shopify…
              </div>
            )}
            {state.status === 'applied' && (
              <>
                <span className="flex items-center gap-1.5 text-success text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Appliqué
                </span>
                <Button onClick={onGenerate} size="sm" variant="ghost">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regénérer
                </Button>
                <a
                  href={`https://${shopDomain}/products/${product.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Voir sur la boutique
                </a>
              </>
            )}
            {state.status === 'error' && (
              <>
                <span className="flex items-center gap-1.5 text-danger text-xs">
                  <AlertCircle className="w-3.5 h-3.5" /> {state.error}
                </span>
                <Button onClick={onGenerate} size="sm" variant="ghost">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Réessayer
                </Button>
              </>
            )}

            {/* Toggle preview */}
            {(state.generated || (product.hasDescription && product.body_html)) && (
              <button
                onClick={onToggle}
                className="ml-auto text-text-muted hover:text-text-secondary transition-colors"
              >
                {state.expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded preview */}
      {state.expanded && (state.generated || product.body_html) && (
        <div className="border-t border-border">
          {state.generated ? (
            <GeneratedPreview result={state.generated} />
          ) : (
            <div className="p-5">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
                Description actuelle
              </p>
              <div
                className="text-sm text-text-secondary leading-relaxed prose prose-sm prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: product.body_html }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Generated Preview ─────────────────────────────────────────────────────────

function GeneratedPreview({ result }: { result: GeneratedContent }) {
  return (
    <div className="p-5 space-y-5">
      {/* Description */}
      <div>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
          Description
        </p>
        <div
          className="text-sm text-text-secondary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: result.description_html }}
        />
      </div>

      {/* Bullet points */}
      <div>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
          Points clés
        </p>
        <ul className="space-y-1.5">
          {result.bullet_points.map((bp, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-success font-bold mt-0.5 flex-shrink-0">✓</span>
              <span>{bp}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* SEO */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-surface-2 border border-border rounded-xl p-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
            Meta description
            <span className={[
              'ml-2 text-[10px] font-normal',
              result.meta_description.length > 155 ? 'text-danger' : 'text-success',
            ].join(' ')}>
              {result.meta_description.length}/155
            </span>
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">{result.meta_description}</p>
        </div>

        {result.seo_title && (
          <div className="bg-surface-2 border border-border rounded-xl p-3">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
              Titre SEO optimisé
            </p>
            <p className="text-xs text-text-secondary font-medium">{result.seo_title}</p>
          </div>
        )}
      </div>
    </div>
  )
}
