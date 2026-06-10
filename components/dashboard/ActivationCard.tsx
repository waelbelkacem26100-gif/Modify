'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle2, Circle, ExternalLink, Sparkles, RefreshCw, MousePointerClick,
} from 'lucide-react'

interface StatusResponse {
  connected: boolean
  theme_editor_url?: string
  app_embeds_url?: string
  blocks: Record<string, boolean>
}

interface BlockDef {
  handle: string
  label: string
  desc: string
  kind: 'block' | 'embed'
}

const BLOCKS: BlockDef[] = [
  { handle: 'trust-badges', label: 'Badges de confiance', desc: 'Paiement sécurisé, garantie et retours sous le bouton d’achat', kind: 'block' },
  { handle: 'social-proof', label: 'Avis clients', desc: 'Étoiles et nombre d’avis sur vos pages produit', kind: 'block' },
  { handle: 'urgency', label: 'Stock limité', desc: 'Message d’urgence pour inciter à l’achat', kind: 'block' },
  { handle: 'json-ld', label: 'Visibilité sur Google', desc: 'Aide votre boutique à mieux apparaître dans les recherches Google', kind: 'embed' },
]

export default function ActivationCard() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/extensions/status')
      if (res.ok) setStatus(await res.json() as StatusResponse)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    // Auto-poll the live theme so the checklist ticks itself once a merchant
    // enables a block in the Shopify editor (GET theme state always works).
    pollRef.current = setInterval(fetchStatus, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchStatus])

  const blocks = status?.blocks ?? {}
  const activeCount = BLOCKS.filter((b) => blocks[b.handle]).length
  const allDone = activeCount === BLOCKS.length

  // Stop hitting the Shopify API once everything is activated
  useEffect(() => {
    if (allDone && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [allDone])

  return (
    <div className="bg-surface border border-primary/30 rounded-2xl overflow-hidden mb-6">
      {/* Header */}
      <div className="p-5 bg-primary/5 border-b border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-syne font-bold text-text-primary text-base">
              {allDone ? '🎉 Tous les blocs sont activés !' : 'Activez vos correctifs en 30 secondes'}
            </h3>
            <p className="text-text-secondary text-sm mt-0.5">
              {allDone
                ? 'Vos correctifs sont en ligne sur votre boutique. Rien d’autre à faire.'
                : 'C’est la seule chose que vous faites manuellement — un clic dans l’éditeur de thème Shopify, et c’est en ligne.'}
            </p>
          </div>
          <span className="ml-auto text-xs font-semibold text-primary flex-shrink-0">
            {activeCount}/{BLOCKS.length}
          </span>
        </div>
      </div>

      {!allDone && (
        <>
          {/* Visual guide — illustrative mock of the Shopify theme editor */}
          <div className="p-5 border-b border-border">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">
              Où cliquer dans l’éditeur de thème
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="bg-surface-2 border border-border rounded-xl p-3">
                <div className="text-[10px] font-bold text-primary mb-2">ÉTAPE 1</div>
                <div className="rounded-lg bg-background border border-border p-2 mb-2 text-[10px] leading-tight">
                  <div className="text-text-muted">Section produit</div>
                  <div className="mt-1 px-2 py-1.5 rounded bg-primary/10 border border-dashed border-primary/40 text-primary flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3" /> + Ajouter un bloc
                  </div>
                </div>
                <p className="text-text-secondary text-xs">Ouvrez la page produit et cliquez « Ajouter un bloc ».</p>
              </div>
              {/* Step 2 */}
              <div className="bg-surface-2 border border-border rounded-xl p-3">
                <div className="text-[10px] font-bold text-primary mb-2">ÉTAPE 2</div>
                <div className="rounded-lg bg-background border border-border p-2 mb-2 text-[10px] leading-tight space-y-1">
                  <div className="text-text-muted">Apps</div>
                  <div className="px-2 py-1 rounded bg-success/10 text-success">Modify Trust Badges</div>
                  <div className="px-2 py-1 rounded bg-surface text-text-secondary">Modify Social Proof</div>
                </div>
                <p className="text-text-secondary text-xs">Dans « Apps », choisissez le bloc Modify.</p>
              </div>
              {/* Step 3 */}
              <div className="bg-surface-2 border border-border rounded-xl p-3">
                <div className="text-[10px] font-bold text-primary mb-2">ÉTAPE 3</div>
                <div className="rounded-lg bg-background border border-border p-2 mb-2 text-[10px] leading-tight">
                  <div className="px-2 py-1.5 rounded bg-primary text-white text-center font-medium">Enregistrer</div>
                </div>
                <p className="text-text-secondary text-xs">Cliquez « Enregistrer » — la case se coche ici automatiquement.</p>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="px-5 pt-4 flex flex-wrap gap-2">
            <a
              href={status?.theme_editor_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir l’éditeur de thème
            </a>
            <a
              href={status?.app_embeds_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              App embeds (JSON-LD)
            </a>
            <button
              onClick={fetchStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-text-muted hover:text-text-secondary text-sm transition-colors ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
          </div>
        </>
      )}

      {/* Checklist */}
      <div className="p-5 space-y-2">
        {BLOCKS.map((b) => {
          const done = blocks[b.handle]
          return (
            <div
              key={b.handle}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                done ? 'bg-success/5 border-success/20' : 'bg-surface-2 border-border',
              ].join(' ')}
            >
              {done
                ? <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                : <Circle className="w-5 h-5 text-text-muted flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${done ? 'text-success' : 'text-text-primary'}`}>
                  {b.label}
                  <span className="ml-2 text-[10px] font-normal text-text-muted uppercase tracking-wide">
                    {b.kind === 'embed' ? 'App embed' : 'App block'}
                  </span>
                </p>
                <p className="text-text-muted text-xs">{b.desc}</p>
              </div>
              {done && <span className="text-success text-xs font-medium flex-shrink-0">Activé</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
