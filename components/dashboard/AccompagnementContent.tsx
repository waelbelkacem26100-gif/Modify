'use client'

import { useState, useEffect } from 'react'
import { ListChecks, Target } from 'lucide-react'
import GuidesContent from '@/components/dashboard/GuidesContent'
import CopilotMissions from '@/components/dashboard/CopilotMissions'
import SubscribeGate from '@/components/dashboard/SubscribeGate'

interface Props {
  isPro: boolean
  hasAccess: boolean
}

// 🤝 Accompagnement — Mody, le copilote 4 métiers. Le chat n'existe QUE depuis
// une mission (contextualisé) : le mode "chat libre" a été retiré en v4.1 —
// Mody travaille toujours sur un sujet précis, jamais dans le vide.
export default function AccompagnementContent({ isPro, hasAccess }: Props) {
  const [tab, setTab] = useState<'missions' | 'guides'>('missions')
  const [missionTitle, setMissionTitle] = useState<string | null>(null)

  // Deep-link depuis ⚡ Corrections : ?mission=<titre du problème> ouvre la
  // mission correspondante directement (lu côté client, zéro Suspense requis).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('mission')
    if (t) { setMissionTitle(t); setTab('missions') }
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-4 border-b border-border">
        {([
          { key: 'missions', label: 'Missions Mody', icon: Target },
          { key: 'guides', label: 'Guides libres', icon: ListChecks },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-colors duration-150',
              tab === t.key
                ? 'text-primary border-primary'
                : 'text-text-secondary border-transparent hover:text-text-primary',
            ].join(' ')}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'missions' ? (
        <CopilotMissions isPro={isPro} hasAccess={hasAccess} initialMissionTitle={missionTitle} />
      ) : hasAccess ? (
        <GuidesContent />
      ) : (
        <SubscribeGate />
      )}
    </div>
  )
}
