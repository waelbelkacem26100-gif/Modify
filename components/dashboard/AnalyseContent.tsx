'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ScanSearch, ExternalLink, ChevronDown, ChevronUp, ArrowRight, Lock,
  CheckCircle2, Loader2, Circle, ThumbsUp,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import { AUDIT_CATEGORIES, CATEGORY_ORDER, type ProblemCategory, type Strength } from '@/lib/audit/types'
import { TOTAL_CHECKS } from '@/lib/audit/checks'
import RecentActivityFeed from '@/components/analyse/RecentActivityFeed'
import ModyBanner from '@/components/dashboard/ModyBanner'
import ProofCard from '@/components/proofs/ProofCard'
import { openMody } from '@/lib/mody-companion'
import { withPreviewToken } from '@/lib/preview'
import { categoryPresentation } from '@/lib/fix-presentation'
import type { Audit, AuditResult } from '@/types'
import type { ProofRecord } from '@/lib/proofs/types'

/** Clé de rapprochement preuve ↔ problème : titre normalisé (insensible casse/accents/ponctuation). */
function normTitle(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

const POLL_MS = 3000
const POLL_TIMEOUT_MS = 8 * 60_000 // la chaîne 6 agents prend ~3 min
const FREE_LIMIT = 3

interface ProgressInfo {
  done: number
  total: number
  current: string | null
  categories: { key: ProblemCategory; emoji: string; label: string; done: boolean; count: number }[]
}

interface Props {
  isSubscribed: boolean
  shopDomain: string | null
  initialAudit: Audit | null
  initialScore: number
  /** Preview publique lecture seule : masque les boutons d'action (audit/correction). */
  previewMode?: boolean
}

type Tab = 'todo' | 'fixed'
type Prio = 'all' | 'high' | 'medium' | 'low'

const PRIORITY_META = {
  high: { emoji: '🔴', label: 'Urgent', cls: 'text-danger bg-danger/10 border-danger/20' },
  medium: { emoji: '🟠', label: 'Important', cls: 'text-warning bg-warning/10 border-warning/20' },
  low: { emoji: '🟡', label: 'À améliorer', cls: 'text-warning bg-surface-2 border-border' },
} as const

function euros(n: number) {
  return `€${Math.round(n).toLocaleString('fr-FR')}`
}

// Méta de catégorie : v2 (6 agents) ou legacy (5) — les deux s'affichent.
function catMeta(category: string): { emoji: string; label: string } {
  return (AUDIT_CATEGORIES as Record<string, { emoji: string; label: string }>)[category]
    ?? categoryPresentation(category)
}

export default function AnalyseContent({ isSubscribed, shopDomain, initialAudit, initialScore, previewMode = false }: Props) {
  const [audit, setAudit] = useState<Audit | null>(initialAudit)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [starting, setStarting] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('todo')
  const [prio, setPrio] = useState<Prio>('all')
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [openProblem, setOpenProblem] = useState<string | null>(null)
  const [strengths, setStrengths] = useState<Strength[]>([])
  const [strengthsOpen, setStrengthsOpen] = useState(false)
  const [checksRun, setChecksRun] = useState<number | null>(null)
  // Preuves des corrections appliquées, indexées par titre normalisé (v6) — une
  // carte problème dont le titre matche affiche sa preuve EN PLACE.
  const [proofs, setProofs] = useState<Map<string, ProofRecord>>(new Map())
  const [proofShop, setProofShop] = useState('')
  const pollStart = useRef(0)

  const running = audit?.status === 'running'

  // Fetch strengths + dynamic checks count once audit is completed.
  const fetchStrengths = useCallback(async () => {
    try {
      const res = await fetch(withPreviewToken('/api/audit/strengths'))
      if (!res.ok) return
      const d = await res.json() as { strengths: Strength[]; checksRun: number | null }
      setStrengths(d.strengths ?? [])
      if (d.checksRun != null) setChecksRun(d.checksRun)
    } catch { /* best-effort */ }
  }, [])

  // Fetch applied-fix proofs and key them by normalized title for in-card display.
  const fetchProofs = useCallback(async () => {
    try {
      const res = await fetch(withPreviewToken('/api/proofs?limit=50'))
      if (!res.ok) return
      const d = await res.json() as { proofs?: ProofRecord[]; shopDomain?: string }
      const m = new Map<string, ProofRecord>()
      for (const p of d.proofs ?? []) m.set(normTitle(p.title), p)
      setProofs(m)
      setProofShop(d.shopDomain ?? shopDomain ?? '')
    } catch { /* best-effort */ }
  }, [shopDomain])

  useEffect(() => {
    if (audit?.status === 'completed') { fetchStrengths(); fetchProofs() }
  }, [audit?.status, fetchStrengths, fetchProofs])

  const poll = useCallback(async () => {
    const res = await fetch('/api/audit/start')
    if (!res.ok) return
    const d = await res.json() as { audit: Audit | null; progress?: ProgressInfo; timedOut?: boolean }
    if (d.audit) {
      setAudit(d.audit)
      if (d.audit.status === 'completed') { fetchStrengths(); fetchProofs() }
    }
    setProgress(d.progress ?? null)
    if (d.timedOut) setError("L'analyse a pris trop de temps — relancez-la.")
  }, [])

  useEffect(() => {
    if (!running) return
    pollStart.current = pollStart.current || Date.now()
    const t = setInterval(() => {
      if (Date.now() - pollStart.current > POLL_TIMEOUT_MS) { clearInterval(t); return }
      poll()
    }, POLL_MS)
    return () => clearInterval(t)
  }, [running, poll])

  async function startAudit() {
    setStarting(true)
    setError('')
    setOpenCats(new Set())
    pollStart.current = Date.now()
    try {
      const res = await fetch('/api/audit/start', { method: 'POST' })
      const d = await res.json() as { audit?: Audit; error?: string }
      if (res.ok && d.audit) { setAudit(d.audit); setProgress(null) }
      else setError(d.error ?? "Impossible de lancer l'analyse.")
    } finally {
      setStarting(false)
    }
  }

  async function fixAll() {
    if (!audit) return
    setFixing(true)
    try {
      const res = await fetch('/api/fixes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: audit.id }),
      })
      if (res.ok) window.location.href = '/dashboard/corrections'
      else setError('La préparation des corrections a échoué. Réessayez.')
    } finally {
      setFixing(false)
    }
  }

  const results: AuditResult[] = audit?.status === 'completed' && Array.isArray(audit.results) ? audit.results : []
  const totalLoss = results.reduce((s, r) => s + (r.impact_euros || 0), 0)
  const visibleLimit = isSubscribed ? Infinity : FREE_LIMIT

  // Titre d'onglet dynamique (T2) : le €/mois identifié quand un audit existe.
  useEffect(() => {
    document.title = results.length > 0 && isSubscribed
      ? `${euros(totalLoss)}/mois identifiés — Modify`
      : 'Tableau de bord — Modify'
  }, [results.length, totalLoss, isSubscribed])

  // Groupement par catégorie (ordre v2 d'abord, puis catégories legacy rencontrées)
  const cats = [...CATEGORY_ORDER.filter((c) => results.some((r) => r.category === c)),
    ...Array.from(new Set(results.map((r) => r.category))).filter((c) => !(CATEGORY_ORDER as string[]).includes(c))]

  // v7 — 2 onglets (à corriger / corrigé) × 3 chips de priorité.
  const filtered = (items: AuditResult[]) => items.filter((r) => {
    const isFixed = proofs.has(normTitle(r.title))
    if (tab === 'todo' && isFixed) return false
    if (tab === 'fixed' && !isFixed) return false
    if (prio !== 'all' && r.priority !== prio) return false
    return true
  })

  // Index global pour le gating freemium (les 3 premiers problèmes toutes catégories
  // confondues, triés par impact).
  const sortedIds = [...results].sort((a, b) => b.impact_euros - a.impact_euros).map((r) => r.id)
  const isLocked = (r: AuditResult) => !isSubscribed && sortedIds.indexOf(r.id) >= visibleLimit

  // v6 — preuve appliquée pour un problème (rapprochement par titre normalisé).
  const proofFor = (r: AuditResult): ProofRecord | undefined => proofs.get(normTitle(r.title))
  // Catégorie auto-dépliée si elle contient ≥1 correction prouvée (preuve sans clic).
  const catHasProof = (cat: string) => results.some((r) => r.category === cat && proofFor(r))
  // Nombre de corrections automatiques pas encore appliquées (pour le bouton « Tout corriger »).
  const correctableCount = results.filter(
    (r) => (r.capability ?? (r.fix_available ? 'auto' : 'guide')) === 'auto' && !proofFor(r)
  ).length

  const scoreColor = initialScore >= 80 ? '#22c55e' : initialScore >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-text-secondary text-sm truncate">{shopDomain ?? ''}</p>
        {shopDomain && (
          <a href={`https://${shopDomain}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:border-primary/40 hover:bg-primary/5 text-text-primary text-sm font-medium rounded-xl transition-colors flex-shrink-0">
            <ExternalLink className="w-4 h-4" /> Visualiser ma boutique
          </a>
        )}
      </div>

      {/* Hero v7 — le chiffre €/mois domine, score à droite, 2 boutons sur 1 ligne */}
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 mb-8"
        title={`${checksRun != null ? checksRun : TOTAL_CHECKS} points de contrôle analysés — un audit SEO classique en couvre 15 à 20.`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 min-w-0">
            {results.length > 0 ? (
              <>
                <p className="text-text-secondary text-sm">Votre boutique perd</p>
                <h1 className="font-syne font-extrabold leading-none mt-1">
                  {isSubscribed ? (
                    <>
                      <span className="text-danger text-5xl sm:text-6xl">{euros(totalLoss)}</span>
                      <span className="text-text-secondary text-2xl"> /mois</span>
                    </>
                  ) : (
                    <>
                      <span className="text-danger text-5xl sm:text-6xl blur-md select-none">€000</span>
                      <span className="text-text-secondary text-2xl"> /mois</span>
                    </>
                  )}
                </h1>
                <p className="text-text-secondary text-sm mt-3">
                  {results.length} problèmes · {CATEGORY_ORDER.length} domaines{strengths.length > 0 && <> · {strengths.length} point{strengths.length > 1 ? 's' : ''} fort{strengths.length > 1 ? 's' : ''}</>}
                </p>
              </>
            ) : (
              <h1 className="font-syne font-extrabold text-3xl sm:text-4xl text-text-primary leading-tight">
                {running ? 'Analyse en cours…' : 'Découvrez ce qui freine vos ventes'}
              </h1>
            )}
            {!previewMode && (
              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <Button variant="secondary" onClick={startAudit} loading={starting || running} disabled={running}>
                  <ScanSearch className="w-4 h-4" />
                  {running ? 'Analyse en cours…' : results.length > 0 ? 'Relancer l’analyse' : 'Analyser ma boutique'}
                </Button>
                {results.length > 0 && isSubscribed && correctableCount > 0 && (
                  <Button onClick={fixAll} loading={fixing}>
                    Tout corriger <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            {error && <p className="text-danger text-sm mt-3">{error}</p>}
          </div>

          {/* Score /100 — anneau à droite */}
          <div className="flex sm:flex-col items-center gap-3 flex-shrink-0">
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: `conic-gradient(${scoreColor} ${initialScore * 3.6}deg, #2A2A38 0deg)` }}>
              <div className="w-[76px] h-[76px] rounded-full bg-surface flex flex-col items-center justify-center">
                <span className="font-syne font-bold text-2xl text-text-primary">{initialScore}</span>
                <span className="text-text-muted text-[10px]">/ 100</span>
              </div>
            </div>
            {/* Contexte honnête du score (P7) — pas de benchmark inventé */}
            <p className="text-text-muted text-xs text-center max-w-[120px]">
              {initialScore >= 90 ? 'Excellent — continuez !' : <>Objectif 90 — encore <span className="text-primary-bright font-medium">{90 - initialScore} points</span></>}
            </p>
          </div>
        </div>
      </div>

      {/* 💜 Bandeau d'activité Mody — juste sous le hero (v6) */}
      <ModyBanner />

      {/* ✅ Points forts — bloc compact remonté sous le hero, expandable (P12/T4 v8) */}
      {strengths.length > 0 && !running && (
        <div className="bg-success/[0.04] border border-success/20 rounded-2xl mb-6 overflow-hidden">
          <button onClick={() => setStrengthsOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-success/[0.06] transition-colors">
            <ThumbsUp className="w-4 h-4 text-success flex-shrink-0" />
            <span className="text-success text-sm font-medium flex-1">
              {strengths.length} chose{strengths.length > 1 ? 's' : ''} qui marche{strengths.length > 1 ? 'nt' : ''} déjà bien
            </span>
            {strengthsOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </button>
          {strengthsOpen && (
            <ul className="px-4 pb-4 pt-1 space-y-3 border-t border-success/15">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-primary text-sm font-medium">{s.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 🛠️ Dernières actions prouvées — juste après le hero, avant les catégories */}
      <RecentActivityFeed />

      {/* Progression temps réel */}
      {running && (
        <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne font-semibold text-text-primary">
              {progress?.current ? `${progress.current}…` : 'Préparation de l’analyse…'}
            </h2>
            <span className="text-text-muted text-sm">{progress?.done ?? 0}/{CATEGORY_ORDER.length}</span>
          </div>
          <Progress value={((progress?.done ?? 0) / CATEGORY_ORDER.length) * 100} className="mb-5" />
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {(progress?.categories ?? CATEGORY_ORDER.map((key) => ({
              key, emoji: AUDIT_CATEGORIES[key].emoji, label: AUDIT_CATEGORIES[key].label, done: false, count: 0,
            }))).map((c, i, arr) => {
              const isCurrent = !c.done && arr.slice(0, i).every((x) => x.done)
              return (
                <li key={c.key} className="flex items-center gap-2.5 text-sm">
                  {c.done
                    ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    : isCurrent
                      ? <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-text-muted flex-shrink-0" />}
                  <span className={c.done ? 'text-text-primary' : isCurrent ? 'text-text-primary' : 'text-text-muted'}>
                    {c.emoji} {c.label}
                  </span>
                  {c.done && c.count > 0 && (
                    <span className="ml-auto text-text-muted text-xs">{c.count} point{c.count > 1 ? 's' : ''}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Résultats par catégorie */}
      {results.length > 0 && !running && (
        <>
          {/* Bouton persistant « Tout corriger » — en haut de la liste (v6) */}
          {!previewMode && isSubscribed && correctableCount > 0 && (
            <div className="flex items-center justify-between gap-3 bg-surface border border-border rounded-2xl px-4 py-3 mb-4">
              <p className="text-sm text-text-secondary min-w-0">
                <span className="text-text-primary font-medium">{correctableCount} correction{correctableCount > 1 ? 's' : ''}</span> que Modify peut appliquer pour vous, automatiquement.
              </p>
              <Button onClick={fixAll} loading={fixing} className="flex-shrink-0">
                Tout corriger <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Filtres v7 — 2 onglets + 3 chips de priorité (5 contrôles max) */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="inline-flex p-0.5 bg-surface-2 rounded-xl">
              {([
                { key: 'todo', label: 'À corriger' },
                { key: 'fixed', label: '✅ Corrigé' },
              ] as { key: Tab; label: string }[]).map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={[
                    'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
                    tab === t.key ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary',
                  ].join(' ')}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { key: 'all', label: 'Tous' },
                { key: 'high', label: '🔴 Urgent' },
                { key: 'medium', label: '🟠 Important' },
                { key: 'low', label: '🟡 Améliorer' },
              ] as { key: Prio; label: string }[]).map((f) => (
                <button key={f.key} onClick={() => setPrio(f.key)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-150',
                    prio === f.key
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-surface text-text-secondary border-border hover:text-text-primary',
                  ].join(' ')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {cats.map((cat) => {
              const items = filtered(results.filter((r) => r.category === cat))
                .sort((a, b) => b.impact_euros - a.impact_euros)
              if (items.length === 0) return null
              const meta = catMeta(cat)
              const catLoss = items.reduce((s, r) => s + r.impact_euros, 0)
              const fixedCount = items.filter((r) => proofFor(r)).length
              // Auto-déplié si la catégorie contient une correction prouvée :
              // la preuve doit être visible sans clic (v6).
              const open = openCats.has(cat) || catHasProof(cat)
              return (
                <div key={cat} className="bg-surface border border-border rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenCats((prev) => {
                    const n = new Set(prev); if (n.has(cat)) n.delete(cat); else n.add(cat); return n
                  })}
                    className="w-full flex items-center gap-3 p-5 text-left hover:bg-surface-2 transition-colors duration-150">
                    <span className="text-xl">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm">{meta.label}</p>
                      <p className="text-text-muted text-xs">
                        {fixedCount > 0 && <span className="text-success">{fixedCount} corrigé{fixedCount > 1 ? 's' : ''} · </span>}
                        {items.length - fixedCount} point{items.length - fixedCount > 1 ? 's' : ''} à améliorer
                      </p>
                    </div>
                    {!isSubscribed ? (
                      <span className="text-danger text-sm font-semibold flex-shrink-0 blur-sm select-none">−€000/mois</span>
                    ) : catLoss > 0 ? (
                      <span className="font-syne text-danger text-sm font-bold flex-shrink-0 whitespace-nowrap">−{euros(catLoss)}/mois</span>
                    ) : (
                      // P6 — pas de « −€0/mois » contre-productif : impact qualitatif
                      <span className="text-text-muted text-xs flex-shrink-0 whitespace-nowrap">Impact sur l’expérience</span>
                    )}
                    {open ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </button>

                  {open && (
                    <ul className="border-t border-border divide-y divide-border">
                      {items.map((r) => {
                        const locked = isLocked(r)
                        const cap = r.capability ?? (r.fix_available ? 'auto' : 'guide')
                        const pr = PRIORITY_META[r.priority] ?? PRIORITY_META.medium
                        const expanded = openProblem === r.id
                        const proof = proofFor(r)
                        // ✅ CORRIGÉ — preuve avant/après EN PLACE, fond/bordure verts,
                        // visible sans clic. Le cycle de vie du problème au même endroit (v6).
                        if (proof && !locked) {
                          return (
                            <li key={r.id} className="bg-success/[0.06] border-l-[3px] border-success p-3 sm:p-4 overflow-hidden animate-proof-reveal">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                                <span className="text-success text-sm font-semibold">Corrigé par Modify</span>
                                {/* Signature « ticket de prix barré » : montant rouge barré (gauche→droite) puis montant vert (v7) */}
                                <span className="ml-auto flex items-center gap-2 font-syne">
                                  <span className="relative text-danger text-sm font-bold whitespace-nowrap">
                                    −{euros(proof.monthlyImpactEur)}/mois
                                    <span className="absolute left-0 top-1/2 h-[2px] w-full bg-danger origin-left animate-strike" />
                                  </span>
                                  <span className="text-success text-sm font-bold whitespace-nowrap opacity-0 animate-price-reveal">
                                    +{euros(proof.monthlyImpactEur)}/mois
                                  </span>
                                </span>
                              </div>
                              <ProofCard proof={proof} shopDomain={proofShop} />
                            </li>
                          )
                        }
                        if (locked) {
                          return (
                            <li key={r.id} className="p-4 flex items-center gap-3">
                              <Lock className="w-4 h-4 text-text-muted flex-shrink-0" />
                              <p className="text-text-muted text-sm blur-[3px] select-none flex-1">{r.title}</p>
                              <a href="/dashboard/subscription"
                                className="text-primary text-xs font-medium hover:text-primary-dark flex-shrink-0">
                                Débloquer →
                              </a>
                            </li>
                          )
                        }
                        // Hiérarchie visuelle par priorité (v6) : 🔴 plus proéminent que 🟡.
                        const accent = r.priority === 'high'
                          ? 'border-l-2 border-danger/50'
                          : r.priority === 'medium' ? 'border-l-2 border-warning/40' : 'border-l-2 border-transparent'
                        return (
                          <li key={r.id} className={accent}>
                            <button onClick={() => setOpenProblem(expanded ? null : r.id)}
                              className={['w-full text-left hover:bg-surface-2 transition-colors duration-150', r.priority === 'high' ? 'p-4 sm:p-5' : 'p-4'].join(' ')}>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${pr.cls}`}>
                                  {pr.emoji} {pr.label}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cap === 'auto' ? 'text-success bg-success/10 border-success/20' : 'text-sky-400 bg-sky-400/10 border-sky-400/20'}`}>
                                  {cap === 'auto' ? '✅ Modify s’en occupe' : '👋 Guide disponible'}
                                </span>
                                <span className="font-syne text-danger text-sm font-bold ml-auto whitespace-nowrap">−{euros(r.impact_euros)}/mois</span>
                              </div>
                              {/* État fermé COMPACT (bug 5) : titre + badges + €/mois uniquement.
                                  La ligne « Concerne : … » n'apparaît qu'au clic (bloc déplié ci-dessous). */}
                              <p className={['text-text-primary font-medium', r.priority === 'high' ? 'text-[15px]' : 'text-sm'].join(' ')}>{r.title}</p>
                            </button>
                            {expanded && (
                              <div className="px-4 pb-4 -mt-1">
                                <p className="text-text-secondary text-sm leading-relaxed mb-2">{r.description}</p>
                                {(r.affected_items?.length ?? 0) > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                                    {r.affected_items!.map((it, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-surface-2 border border-border rounded-md text-[11px] text-text-secondary">{it}</span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-text-secondary text-xs mb-3">
                                  <span className="text-text-muted font-medium">Recommandation : </span>{r.recommendation}
                                </p>
                                {cap === 'auto' ? (
                                  <a href="/dashboard/corrections"
                                    className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:text-primary-dark transition-colors">
                                    Voir le correctif <ArrowRight className="w-3.5 h-3.5" />
                                  </a>
                                ) : (
                                  <button onClick={() => openMody(r.title)}
                                    className="inline-flex items-center gap-1.5 text-mody-bright text-sm font-medium hover:text-mody transition-colors">
                                    Demander à Mody <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          {/* CTA freemium */}
          {!isSubscribed && (
            <div className="mt-6 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 rounded-2xl p-6 text-center">
              <p className="font-syne font-semibold text-text-primary mb-1">
                {Math.max(0, results.length - FREE_LIMIT)} autres points détectés sur votre boutique
              </p>
              <p className="text-text-secondary text-sm mb-4">
                Débloquez l’analyse complète et laissez Modify corriger automatiquement.
              </p>
              <a href="/dashboard/subscription"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors">
                Débloquer tout — dès 9€/mois <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </>
      )}

      {/* État vide élégant */}
      {results.length === 0 && !running && (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-surface border border-border flex items-center justify-center">
            <ScanSearch className="w-7 h-7 text-text-muted" />
          </div>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Lancez votre première analyse : Modify passe votre boutique au crible sur {CATEGORY_ORDER.length} domaines
            ({TOTAL_CHECKS}+ points de contrôle) et vous montre exactement où vous perdez des ventes.
          </p>
        </div>
      )}
    </div>
  )
}
