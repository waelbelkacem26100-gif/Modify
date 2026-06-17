'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle, RotateCcw, RefreshCw, Eye, Rocket, X, Wand2, Zap, ArrowRight,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import BeforeAfterSlider from '@/components/dashboard/BeforeAfterSlider'
import { fixMode, whatChanged, beforeAfter } from '@/lib/fix-presentation'
import { fixCapability, CAPABILITY_META } from '@/lib/fix-capability'
import type { Fix } from '@/types'
import type { ProofRecord } from '@/lib/proofs/types'

/**
 * Bloc preuve COMPACT (≤120px) affiché directement dans la carte d'un correctif
 * "Corrigé", sans clic. Rien n'est affiché si aucune preuve n'est disponible —
 * jamais de bloc vide ni de visuel factice.
 */
function CompactProof({ proof }: { proof: ProofRecord }) {
  if (proof.proofType === 'google_preview' && (proof.after.text || proof.after.description)) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 space-y-1.5 max-h-[120px] overflow-hidden">
        <p className="text-xs truncate">
          <span className="text-text-muted font-semibold uppercase text-[10px] mr-1.5">Avant</span>
          <span className="text-text-secondary">{proof.before.text || 'Aucun titre Google personnalisé'}</span>
        </p>
        <p className="text-xs truncate">
          <span className="text-primary font-semibold uppercase text-[10px] mr-1.5">Après</span>
          <span className="text-text-primary">{proof.after.text}</span>
        </p>
      </div>
    )
  }
  if (proof.proofType === 'structured_data' && proof.after.hasStructuredData) {
    return (
      <p className="mt-3 text-xs text-success">
        ✓ {(proof.fieldsAdded ?? []).join(', ')} maintenant visibles par Google
      </p>
    )
  }
  if (proof.proofType === 'visual' && proof.before.screenshotUrl && proof.after.screenshotUrl) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 max-h-[120px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={proof.before.screenshotUrl} alt="Avant" className="rounded-lg border border-border object-cover object-top h-[110px] w-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={proof.after.screenshotUrl} alt="Après" className="rounded-lg border border-primary/40 object-cover object-top h-[110px] w-full" />
      </div>
    )
  }
  return null
}

type StoreMode = 'auto' | 'approval'
type Tab = 'auto' | 'guides'

export default function FixesContent() {
  const [fixes, setFixes] = useState<Fix[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('auto')
  const [applying, setApplying] = useState<string | null>(null)
  const [applyingAll, setApplyingAll] = useState(false)
  const [rolling, setRolling] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({})
  const [shopDomain, setShopDomain] = useState<string | null>(null)
  const [mode, setMode] = useState<StoreMode>('auto')
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [proofsById, setProofsById] = useState<Record<string, ProofRecord>>({})
  const auditIdRef = useRef<string | null>(null)

  // Preuves compactes pour les correctifs "Corrigé" (Impact Visible).
  useEffect(() => {
    fetch('/api/proofs?limit=50', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { proofs?: ProofRecord[] } | null) => {
        if (!d?.proofs) return
        setProofsById(Object.fromEntries(d.proofs.map((p) => [p.id, p])))
      })
      .catch(() => {})
  }, [])

  const fetchFixes = useCallback(async () => {
    const res = await fetch('/api/fixes/apply')
    if (res.ok) {
      const data = await res.json() as { fixes: Fix[]; shop_domain?: string }
      setFixes(data.fixes ?? [])
      setShopDomain(data.shop_domain ?? null)
      auditIdRef.current = data.fixes?.[0]?.audit_id ?? null
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchFixes() }, [fetchFixes])

  // Pendant "Tout appliquer" (chaîne serveur), on rafraîchit la liste : les
  // statuts passent à "Corrigé" un par un, même si l'onglet avait été fermé.
  useEffect(() => {
    if (!applyingAll) return
    const t = setInterval(async () => {
      await fetchFixes()
    }, 4000)
    return () => clearInterval(t)
  }, [applyingAll, fetchFixes])
  useEffect(() => {
    if (applyingAll && !fixes.some((f) => f.status === 'pending' && fixCapability(f) === 'auto')) {
      setApplyingAll(false)
      // Bannière honnête : pas de "tout appliqué" si un correctif a échoué.
      const failed = fixes.filter((f) => f.status === 'failed' && fixCapability(f) === 'auto').length
      if (failed === 0) setConfirmation('Tous les correctifs automatiques')
    }
  }, [fixes, applyingAll])

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
      // Pipeline serveur : backup → application → vérification Shopify →
      // screenshot de preuve → statut. (Les captures sont prises côté serveur.)
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
        if (newStatus === 'applied') {
          showConfirmation(fix.title)
          // Laisse le temps au screenshot "après" d'arriver, puis rafraîchit.
          setTimeout(fetchFixes, 9000)
        }
      } else {
        setApplyErrors((prev) => ({ ...prev, [fix.id]: data.error ?? 'Une erreur est survenue.' }))
      }
    } finally {
      setApplying(null)
    }
  }

  // "Tout appliquer" : déclenche la chaîne serveur (1 correctif par étape) —
  // l'onglet peut être fermé, la chaîne continue toute seule.
  async function applyAll() {
    if (!auditIdRef.current) return
    if (!window.confirm('Appliquer tous les correctifs automatiques ? Une sauvegarde est créée avant chaque modification.')) return
    setApplyingAll(true)
    const res = await fetch('/api/fixes/apply-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit_id: auditIdRef.current }),
    })
    if (!res.ok) setApplyingAll(false)
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
    if (!window.confirm('Annuler cette correction ? Les valeurs d’origine seront restaurées sur votre boutique.')) return
    setRolling(fix.id)
    try {
      const res = await fetch('/api/fixes/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fix.id }),
      })
      if (res.ok) setFixes((prev) => prev.map((f) => f.id === fix.id ? { ...f, status: 'rolled_back' } : f))
      else {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setApplyErrors((prev) => ({ ...prev, [fix.id]: d.error ?? 'L’annulation a échoué.' }))
      }
    } finally {
      setRolling(null)
    }
  }

  const autoFixes = fixes.filter((f) => fixCapability(f) === 'auto')
  const guideFixes = fixes.filter((f) => fixCapability(f) === 'guide')
  const totalRecovered = fixes.filter((f) => f.status === 'applied').reduce((s, f) => s + f.impact_euros, 0)
  const pendingAuto = autoFixes.filter((f) => f.status === 'pending').length
  const shown = tab === 'auto' ? autoFixes : guideFixes

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
          <p className="text-sm font-medium">{confirmation} appliqué — visible sur votre boutique</p>
          <button onClick={() => setConfirmation(null)} className="ml-1" aria-label="Fermer la notification"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header — l'objectif en grand */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">
            {totalRecovered > 0
              ? <>Corrections : <span className="text-success">{`€${Math.round(totalRecovered).toLocaleString('fr-FR')}`}/mois récupérés</span></>
              : 'Vos corrections'}
          </h1>
          <p className="text-text-secondary text-sm">
            Sauvegarde → application → vérification sur Shopify : « Corrigé » uniquement si c’est réellement en ligne.
          </p>
        </div>
        {shopDomain && (
          <a href={`https://${shopDomain}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:border-primary/40 hover:bg-primary/5 text-text-primary text-sm font-medium rounded-xl transition-colors flex-shrink-0">
            <Eye className="w-4 h-4" /> Visualiser ma boutique
          </a>
        )}
      </div>

      {/* Mode toggle */}
      <div className="mb-6 bg-surface border border-border rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-text-primary text-sm font-medium">Mode de votre boutique</p>
          <p className="text-text-muted text-xs">
            {mode === 'auto'
              ? 'Modify applique les améliorations automatiquement chaque semaine.'
              : 'Modify vous envoie un email chaque lundi — vous validez en 1 clic.'}
          </p>
        </div>
        <div className="flex items-center bg-surface-2 rounded-xl p-1">
          {(['auto', 'approval'] as StoreMode[]).map((m) => (
            <button key={m} onClick={() => changeMode(m)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150',
                mode === m ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}>
              {m === 'auto' ? '🔄 Automatique' : '✋ Sur validation'}
            </button>
          ))}
        </div>
      </div>

      {/* Onglets + Tout appliquer */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center bg-surface border border-border rounded-xl p-1">
          {([
            { key: 'auto', label: `✅ Automatiques (${autoFixes.length})` },
            { key: 'guides', label: `👋 Guides (${guideFixes.length})` },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                tab === t.key ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'auto' && pendingAuto > 0 && (
          <Button size="sm" onClick={applyAll} loading={applyingAll}>
            <Zap className="w-3.5 h-3.5" />
            {applyingAll ? 'Application en cours…' : `Tout appliquer (${pendingAuto})`}
          </Button>
        )}
      </div>

      {applyingAll && (
        <div className="mb-4 flex items-start gap-2.5 bg-primary/5 border border-primary/15 rounded-xl p-3">
          <span className="w-4 h-4 mt-0.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-text-secondary text-xs leading-snug">
            Modify applique vos correctifs un par un (sauvegarde + vérification à chaque fois).
            Vous pouvez fermer cette page : tout continue automatiquement.
          </p>
        </div>
      )}

      {/* Liste */}
      {shown.length === 0 ? (
        <div className="text-center py-12">
          <Wand2 className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary text-sm mb-4">
            {fixes.length === 0
              ? 'Lancez une analyse pour générer vos corrections.'
              : tab === 'auto' ? 'Aucune correction automatique pour le moment.' : 'Aucun guide pour le moment.'}
          </p>
          {fixes.length === 0 && (
            <a href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors">
              Aller à l’analyse <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((fix) => {
            const cap = fixCapability(fix)
            const capInfo = CAPABILITY_META[cap]
            const applied = fix.status === 'applied'
            const isExpanded = expanded === fix.id
            return (
              <div key={fix.id} className={[
                'bg-surface border rounded-2xl p-5 transition-all duration-150',
                applied ? 'border-success/30 opacity-70 hover:opacity-100' : 'border-border',
              ].join(' ')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${capInfo.cls}`}>
                        {capInfo.emoji} {capInfo.label}
                      </span>
                      {cap !== 'guide' && (
                        <Badge variant={fix.status as 'applied' | 'pending' | 'rolled_back' | 'failed' | 'preview'}>
                          {applied ? '✓ Corrigé' :
                           fix.status === 'rolled_back' ? 'Annulé' :
                           fix.status === 'failed' ? 'Échec — réessayer' :
                           fix.status === 'preview' ? 'En attente de votre validation' : 'À appliquer'}
                        </Badge>
                      )}
                      {/* Badge impact — rouge tant que le problème coûte, vert une fois récupéré */}
                      <span className={[
                        'ml-auto flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                        applied
                          ? 'text-success bg-success/10 border-success/25'
                          : 'text-danger bg-danger/10 border-danger/25',
                      ].join(' ')}>
                        {applied
                          ? <><CheckCircle className="w-3.5 h-3.5" /> +€{fix.impact_euros}/mois récupérés</>
                          : <>−€{fix.impact_euros}/mois</>}
                      </span>
                    </div>

                    <h3 className="font-medium text-text-primary text-sm mb-1">{fix.title}</h3>

                    {cap === 'guide' ? (
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <span className="text-sky-400 font-medium">À faire avec le Copilot : </span>
                        Modify ne peut pas créer ça à votre place (avis réels, vidéos, photos produit), mais le Copilot
                        prépare le contenu et vous accompagne étape par étape.
                      </p>
                    ) : (
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <span className="text-text-muted font-medium">Ce qui change : </span>
                        {whatChanged(fix)}
                      </p>
                    )}

                    {/* Détail before/after (texte) */}
                    {cap !== 'guide' && (applied || fix.status === 'pending') && (() => {
                      const ba = beforeAfter(fix)
                      return (
                        <div className="mt-3 grid sm:grid-cols-2 gap-2">
                          <div className="bg-danger/5 border border-danger/15 rounded-lg p-2.5">
                            <p className="text-danger text-[11px] font-semibold uppercase tracking-wide mb-0.5">Avant</p>
                            <p className="text-text-secondary text-xs leading-snug">{ba.before}</p>
                          </div>
                          <div className="bg-success/5 border border-success/15 rounded-lg p-2.5">
                            <p className="text-success text-[11px] font-semibold uppercase tracking-wide mb-0.5">{applied ? 'Après' : 'Après (aperçu)'}</p>
                            <p className="text-text-secondary text-xs leading-snug">{ba.after}</p>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Détail complet — révélé par « Voir le détail » (description du correctif) */}
                    {isExpanded && cap !== 'guide' && fix.description && (
                      <div className="mt-3 bg-surface-2 border border-border rounded-lg p-3">
                        <p className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap">{fix.description}</p>
                      </div>
                    )}

                    {/* Preuve compacte visible SANS clic (Impact Visible) */}
                    {applied && proofsById[fix.id] && <CompactProof proof={proofsById[fix.id]} />}

                    {/* Preuve visuelle — slider avant/après (screenshots réels) */}
                    {fix.screenshot_before && fix.screenshot_after && (
                      <div className="mt-3">
                        <button onClick={() => setExpanded(isExpanded ? null : fix.id)}
                          className="text-primary text-xs font-medium hover:text-primary-dark transition-colors">
                          {isExpanded ? 'Masquer la comparaison ▲' : 'Voir la preuve avant / après ▼'}
                        </button>
                        {isExpanded && (
                          <div className="mt-2">
                            <p className="text-text-muted text-[11px] mb-1.5">Glissez pour comparer votre page avant / après :</p>
                            <BeforeAfterSlider beforeUrl={fix.screenshot_before ?? undefined} afterUrl={fix.screenshot_after ?? undefined} unavailableReason="Boutique protégée par mot de passe" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Confirmation + lien réel */}
                    {applied && cap !== 'guide' && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 border border-success/20 rounded-lg text-success text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Vérifié sur Shopify
                        </span>
                        {shopDomain && (
                          <a href={`https://${shopDomain}/collections/all`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:text-primary-dark transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Voir sur ma boutique →
                          </a>
                        )}
                      </div>
                    )}

                    {applyErrors[fix.id] && (
                      <p className="text-danger text-xs mt-2">{applyErrors[fix.id]}</p>
                    )}
                  </div>

                  {/* Actions — CTA primaire « Corriger maintenant » + secondaire « Voir le détail » */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                    {cap === 'guide' && (
                      <a href={`/dashboard/accompagnement?mission=${encodeURIComponent(fix.title)}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 transition-colors">
                        Lancer la mission avec le Copilot →
                      </a>
                    )}
                    {cap === 'auto' && fix.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => applyFix(fix)} loading={applying === fix.id} disabled={applyingAll}>
                          <CheckCircle className="w-3.5 h-3.5" /> Corriger maintenant
                        </Button>
                        {/* Secondaire : contour violet, fond transparent (hiérarchie claire) */}
                        <button
                          onClick={() => setExpanded(isExpanded ? null : fix.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary text-primary bg-transparent hover:bg-primary/10 transition-colors">
                          {isExpanded ? 'Masquer le détail' : 'Voir le détail'}
                        </button>
                      </>
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
                    {fix.status === 'failed' && cap === 'auto' && (
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
