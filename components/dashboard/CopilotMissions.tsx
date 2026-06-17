'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Loader2,
  Lock, ScanSearch, Sparkles, Target,
} from 'lucide-react'
import AgentChat from '@/components/dashboard/AgentChat'
import SubscribeButton from '@/components/dashboard/SubscribeButton'
import { MISSION_TO_METIER, METIER_META, METIER_ORDER, type Metier, type MissionType } from '@/lib/copilot/mission-types'

/** Miroir de lib/copilot/missions.ts (shape renvoyée par /api/copilot/missions). */
interface Mission {
  problem_id: string
  type: string
  emoji: string
  type_label: string
  problem_title: string
  problem_description: string
  impact_euros: number
  priority: 'high' | 'medium' | 'low'
  affected_items: string[]
  status: 'none' | 'in_progress' | 'done'
  guide_id: string | null
  steps_done: number
  steps_total: number
}

interface GuideDetail {
  id: string
  title: string
  summary: string
  status: 'todo' | 'done'
  steps: { title: string; detail: string; done?: boolean }[]
}

const PRIORITY_SECTIONS = [
  { key: 'high', label: '🔴 Urgent' },
  { key: 'medium', label: '🟠 Important' },
  { key: 'low', label: '🟡 À améliorer' },
] as const

function euros(n: number) { return `€${Math.round(n).toLocaleString('fr-FR')}` }

interface Props {
  isPro: boolean
  hasAccess: boolean
  /** Deep-link depuis ⚡ Corrections : titre du problème à ouvrir directement. */
  initialMissionTitle?: string | null
}

/**
 * 🎯 Missions Copilot — chaque problème 👋 Guide du dernier audit devient une
 * mission que le Copilot accompagne : contenu réel généré (briefs, emails,
 * scripts), checklist persistée, chat contextualisé.
 */
export default function CopilotMissions({ isPro, hasAccess, initialMissionTitle }: Props) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [openMission, setOpenMission] = useState<Mission | null>(null)
  const [guide, setGuide] = useState<GuideDetail | null>(null)
  const [openStep, setOpenStep] = useState<number | null>(null)
  const [deepLinkDone, setDeepLinkDone] = useState(false)
  const [metier, setMetier] = useState<Metier | 'all'>('all')

  const fetchMissions = useCallback(async (): Promise<Mission[]> => {
    try {
      const res = await fetch('/api/copilot/missions')
      if (!res.ok) return []
      const d = await res.json() as { missions: Mission[] }
      setMissions(d.missions ?? [])
      return d.missions ?? []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMissions() }, [fetchMissions])

  const loadGuide = useCallback(async (guideId: string) => {
    const res = await fetch('/api/guides')
    if (!res.ok) return
    const d = await res.json() as { guides: GuideDetail[] }
    const g = (d.guides ?? []).find((x) => x.id === guideId)
    if (g) setGuide({ ...g, steps: Array.isArray(g.steps) ? g.steps : [] })
  }, [])

  async function launch(m: Mission) {
    if (m.guide_id) {
      setOpenMission(m)
      setGuide(null)
      await loadGuide(m.guide_id)
      return
    }
    setLaunching(m.problem_id)
    setError('')
    try {
      const res = await fetch('/api/copilot/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: m.problem_id }),
      })
      const d = await res.json() as { guide_id?: string; error?: string }
      if (res.ok && d.guide_id) {
        const fresh = await fetchMissions()
        const updated = fresh.find((x) => x.problem_id === m.problem_id)
        if (updated) { setOpenMission(updated); setGuide(null); await loadGuide(d.guide_id) }
      } else {
        setError(d.error ?? 'La préparation de la mission a échoué.')
      }
    } catch {
      setError('Connexion impossible.')
    } finally {
      setLaunching(null)
    }
  }

  // Deep-link depuis Corrections : ouvre (ou lance) la mission au titre donné.
  useEffect(() => {
    if (deepLinkDone || loading || !initialMissionTitle || missions.length === 0) return
    setDeepLinkDone(true)
    const m = missions.find((x) => x.problem_title === initialMissionTitle)
    if (m) launch(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, missions, initialMissionTitle, deepLinkDone])

  async function toggleStep(i: number) {
    if (!guide) return
    const done = !guide.steps[i]?.done
    const steps = guide.steps.map((s, j) => j === i ? { ...s, done } : s)
    const allDone = steps.length > 0 && steps.every((s) => s.done)
    setGuide({ ...guide, steps, status: allDone ? 'done' : 'todo' })
    setMissions((prev) => prev.map((m) => m.guide_id === guide.id
      ? { ...m, steps_done: steps.filter((s) => s.done).length, steps_total: steps.length, status: allDone ? 'done' : 'in_progress' }
      : m))
    await fetch('/api/guides', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guide_id: guide.id, step_index: i, done }),
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Vue mission ouverte : checklist + chat contextualisé ──────────────────
  if (openMission) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl">
        <button onClick={() => { setOpenMission(null); setGuide(null); fetchMissions() }}
          className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Toutes les missions
        </button>

        <div className="flex items-start gap-3 mb-1">
          <span className="text-2xl">{openMission.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-syne font-bold text-xl text-text-primary">{guide?.title ?? openMission.problem_title}</h1>
            <p className="text-text-secondary text-sm mt-1">{guide?.summary ?? openMission.problem_description}</p>
          </div>
          <span className="text-warning font-semibold text-sm flex-shrink-0">{euros(openMission.impact_euros)}/mois</span>
        </div>
        <p className="text-text-muted text-xs mb-6 ml-10">
          Mission {openMission.type_label} · issue de votre analyse : « {openMission.problem_title} »
        </p>

        {!guide ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center mb-6">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-text-secondary text-sm">Chargement de la mission…</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <p className="text-text-primary text-sm font-medium">
                Votre plan d’action — {guide.steps.filter((s) => s.done).length}/{guide.steps.length} étapes faites
              </p>
              {guide.status === 'done' && (
                <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mission terminée
                </span>
              )}
            </div>
            <ol className="divide-y divide-border">
              {guide.steps.map((s, i) => (
                <li key={i}>
                  <div className="p-4 flex gap-3 items-start">
                    <button onClick={() => toggleStep(i)} className="flex-shrink-0 mt-0.5" title={s.done ? 'Décocher' : 'Marquer comme fait'}>
                      {s.done
                        ? <CheckCircle2 className="w-5 h-5 text-success" />
                        : <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">{i + 1}</span>}
                    </button>
                    <button onClick={() => setOpenStep(openStep === i ? null : i)} className="flex-1 min-w-0 text-left">
                      <p className={`text-sm font-medium ${s.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{s.title}</p>
                      {openStep !== i && (
                        <p className="text-text-muted text-xs mt-0.5 truncate">{s.detail.slice(0, 90)}…</p>
                      )}
                    </button>
                    {openStep === i ? <ChevronUp className="w-4 h-4 text-text-muted mt-1" /> : <ChevronDown className="w-4 h-4 text-text-muted mt-1" />}
                  </div>
                  {openStep === i && (
                    <div className="px-4 pb-4 ml-8">
                      <div className="bg-surface-2 border border-border rounded-xl p-4">
                        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{s.detail}</p>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Chat Copilot contextualisé sur CETTE mission */}
        {openMission.guide_id && <AgentChat isPro={isPro} missionId={openMission.guide_id} compact />}
      </div>
    )
  }

  // ── Liste des missions : 4 métiers Mody + groupes par priorité ─────────────
  const totalEuros = missions.reduce((s, m) => s + m.impact_euros, 0)
  const metierOf = (m: Mission): Metier => MISSION_TO_METIER[m.type as MissionType] ?? 'contenu'
  const countByMetier = METIER_ORDER.map((k) => ({ key: k, ...METIER_META[k], count: missions.filter((m) => metierOf(m) === k).length }))
  const visible = metier === 'all' ? missions : missions.filter((m) => metierOf(m) === metier)

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-5">
        <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">Mody, votre copilote e-commerce</h1>
        <p className="text-text-secondary text-sm max-w-2xl">
          Mody transforme chaque problème que Modify détecte mais ne peut pas corriger
          automatiquement en contenu prêt à l’emploi.
        </p>
        {missions.length > 0 && (
          <p className="text-text-muted text-xs mt-2">
            {missions.length} mission{missions.length > 1 ? 's' : ''} · {euros(totalEuros)}/mois en jeu au total
          </p>
        )}
      </div>

      {/* Les 4 métiers de Mody — cartes cliquables qui filtrent la liste */}
      {missions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
          {countByMetier.map((c) => {
            const active = metier === c.key
            return (
              <button key={c.key} onClick={() => setMetier(active ? 'all' : c.key)}
                className={[
                  'text-left rounded-2xl border p-3.5 transition-colors',
                  active ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/40',
                ].join(' ')}>
                <p className="text-lg leading-none mb-1.5">{c.emoji}</p>
                <p className={`text-sm font-medium ${active ? 'text-primary' : 'text-text-primary'}`}>{c.label}</p>
                <p className="text-text-muted text-[11px] mt-0.5 leading-snug">{c.desc}</p>
                <p className={`text-xs font-semibold mt-1.5 ${active ? 'text-primary' : 'text-text-secondary'}`}>
                  {c.count} mission{c.count > 1 ? 's' : ''}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {missions.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Target className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucune mission pour le moment</h3>
          <p className="text-text-secondary text-sm mb-4 max-w-md mx-auto">
            Les missions naissent de votre analyse : lancez-en une sur l’onglet Analyse et le
            Copilot transformera chaque point « 👋 Guide » en plan d’action personnalisé.
          </p>
          <a href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors">
            <ScanSearch className="w-4 h-4" /> Analyser ma boutique
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {PRIORITY_SECTIONS.map(({ key, label }) => {
            const items = visible.filter((m) => m.priority === key)
            if (items.length === 0) return null
            return (
              <div key={key}>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
                <div className="space-y-2.5">
                  {items.map((m, idx) => {
                    // Aperçu gratuit : la première mission est lançable, les autres floutées.
                    const locked = !hasAccess && !(key === PRIORITY_SECTIONS[0].key && idx === 0) && missions.indexOf(m) > 0
                    const busy = launching === m.problem_id
                    return (
                      <div key={m.problem_id} className={`bg-surface border rounded-2xl p-4 sm:p-5 ${m.status === 'done' ? 'border-success/30' : 'border-border'}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl flex-shrink-0">{m.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-[10px] text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-full">{m.type_label}</span>
                              {m.status === 'in_progress' && (
                                <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                                  En cours · {m.steps_done}/{m.steps_total} étapes
                                </span>
                              )}
                              {m.status === 'done' && (
                                <span className="text-[10px] text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">Terminée ✓</span>
                              )}
                              <span className="text-warning text-sm font-semibold ml-auto flex-shrink-0">{euros(m.impact_euros)}/mois</span>
                            </div>
                            <p className={`text-sm font-medium ${locked ? 'text-text-muted blur-[3px] select-none' : 'text-text-primary'}`}>{m.problem_title}</p>
                            {!locked && (
                              <p className="text-text-secondary text-xs mt-1 leading-relaxed line-clamp-2">{m.problem_description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end mt-3">
                          {locked ? (
                            <span className="inline-flex items-center gap-1.5 text-text-muted text-xs">
                              <Lock className="w-3.5 h-3.5" /> Inclus dans l’abonnement
                            </span>
                          ) : (
                            <button onClick={() => launch(m)} disabled={launching != null}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors disabled:opacity-50">
                              {busy ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Le Copilot prépare votre contenu…</>)
                                : m.status === 'none' ? (<><Sparkles className="w-3.5 h-3.5" /> Lancer la mission</>)
                                : (<>Reprendre la mission <ArrowRight className="w-3.5 h-3.5" /></>)}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {!hasAccess && (
            <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 rounded-2xl p-6 text-center">
              <p className="font-syne font-semibold text-text-primary mb-1">Débloquez toutes vos missions</p>
              <p className="text-text-secondary text-sm mb-4">Contenu complet généré pour chaque mission + Copilot illimité.</p>
              <SubscribeButton plan="pro" size="md" label="Passer à Pro — 49€/mois" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
