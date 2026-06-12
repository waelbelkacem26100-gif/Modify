'use client'

import { useState } from 'react'
import { MessageCircle, ListChecks } from 'lucide-react'
import AgentChat from '@/components/dashboard/AgentChat'
import GuidesContent from '@/components/dashboard/GuidesContent'
import SubscribeGate from '@/components/dashboard/SubscribeGate'

interface Props {
  isPro: boolean
  hasAccess: boolean
}

// 🤝 Accompagnement — l'agent assistant en interface principale, les guides
// pas à pas accessibles dans un onglet (et référencés par l'agent lui-même).
export default function AccompagnementContent({ isPro, hasAccess }: Props) {
  const [tab, setTab] = useState<'agent' | 'guides'>('agent')

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-4 border-b border-border">
        {([
          { key: 'agent', label: 'Votre coach', icon: MessageCircle },
          { key: 'guides', label: 'Guides pas à pas', icon: ListChecks },
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

      {tab === 'agent' ? (
        <AgentChat isPro={isPro} />
      ) : hasAccess ? (
        <GuidesContent />
      ) : (
        <SubscribeGate />
      )}
    </div>
  )
}
