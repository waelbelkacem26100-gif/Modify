'use client'

import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import ModyAvatar from '@/components/brand/ModyAvatar'
import { openMody } from '@/lib/mody-companion'
import { MISSION_META, type MissionType } from '@/lib/copilot/mission-types'

interface Mission {
  problem_id: string
  type: string
  emoji: string
  type_label: string
  problem_title: string
  impact_euros: number
  priority: 'high' | 'medium' | 'low'
  status: 'none' | 'in_progress' | 'done'
}

const PRIO_RANK = { high: 0, medium: 1, low: 2 } as const

/**
 * 💜 Bandeau d'activité Mody (v6) — juste sous le hero du Tableau de bord.
 *
 * Pas un chat ouvert : un teaser intelligent qui montre que Mody a quelque chose
 * d'utile à proposer MAINTENANT. La mission teasée est la plus prioritaire (🔴
 * d'abord, puis € décroissant) parmi celles pas encore lancées. Clic → ouvre le
 * compagnon flottant directement sur cette mission. État vide honnête si rien.
 */
export default function ModyBanner() {
  const [mission, setMission] = useState<Mission | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [hasAny, setHasAny] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/copilot/missions')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { missions?: Mission[] } | null) => {
        if (!alive) return
        const missions = d?.missions ?? []
        setHasAny(missions.length > 0)
        const open = missions
          .filter((m) => m.status !== 'done')
          .sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || b.impact_euros - a.impact_euros)
        setMission(open[0] ?? null)
        setLoaded(true)
      })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  if (!loaded) return null

  // État vide honnête — tout est lancé / aucune mission disponible
  if (!mission) {
    return (
      <div className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-4 py-3 mb-6">
        <ModyAvatar size={34} />
        <p className="text-sm text-text-secondary">
          {hasAny
            ? <>Mody a tout lancé — rien à préparer pour l’instant <span className="text-text-muted">👍</span></>
            : <>Mody est prêt à t’aider dès qu’il y aura quelque chose à faire. Lance une analyse pour commencer.</>}
        </p>
      </div>
    )
  }

  const meta = MISSION_META[mission.type as MissionType]
  const generates = meta?.generates ? meta.generates.charAt(0).toLowerCase() + meta.generates.slice(1) : 'un livrable prêt à l’emploi'

  return (
    <button
      onClick={() => openMody(mission.problem_title)}
      className="group w-full flex items-center gap-3.5 text-left bg-gradient-to-r from-mody-glow to-surface border border-mody/25 hover:border-mody/50 rounded-2xl px-4 py-3.5 mb-6 transition-all duration-200"
    >
      <ModyAvatar size={40} glow />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-mody-bright uppercase tracking-wide mb-0.5">Mody a une suggestion</p>
        <p className="text-sm text-text-primary leading-snug">
          <span className="font-medium">« {mission.problem_title} »</span>
          <span className="text-text-secondary"> — je peux préparer {generates}.</span>
        </p>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1.5 flex-shrink-0 text-sm font-medium text-mody-bright group-hover:gap-2.5 transition-all">
        Voir <ArrowRight className="w-4 h-4" />
      </span>
      <ArrowRight className="sm:hidden w-4 h-4 text-mody-bright flex-shrink-0" />
    </button>
  )
}
