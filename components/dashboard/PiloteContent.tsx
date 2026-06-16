import { CheckCircle2, Info, TrendingUp, ShieldAlert, Gauge } from 'lucide-react'
import { relativeFr, type PiloteEntry } from '@/lib/pilote-feed'

const KIND_META = {
  success: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  info: { icon: Info, color: 'text-primary-bright', bg: 'bg-primary/10' },
  trend: { icon: TrendingUp, color: 'text-mody-bright', bg: 'bg-mody/10' },
  alert: { icon: ShieldAlert, color: 'text-warning', bg: 'bg-warning/10' },
} as const

// ⚙️ Pilote automatique — feed de l'activité d'automatisation RÉELLE de Modify.
export default function PiloteContent({ entries }: { entries: PiloteEntry[] }) {
  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-6 flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Gauge className="w-5 h-5 text-primary-bright" />
        </span>
        <div>
          <h1 className="font-syne font-extrabold text-2xl text-text-primary mb-1">Pilote automatique</h1>
          <p className="text-text-secondary text-sm">Ce que Modify fait pour vous, automatiquement — pendant que vous gérez votre boutique.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <Gauge className="w-9 h-9 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary text-sm">
            Le pilote se met en route dès votre première analyse. Chaque action automatique
            apparaîtra ici, horodatée.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {entries.map((e, i) => {
            const m = KIND_META[e.kind]
            return (
              <li key={i} className="flex items-start gap-3 bg-surface border border-border rounded-2xl p-4">
                <span className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center flex-shrink-0`}>
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary text-sm font-medium">{e.title}</p>
                  {e.detail && <p className="text-text-muted text-xs mt-0.5">{e.detail}</p>}
                </div>
                <span className="text-text-muted text-xs flex-shrink-0 whitespace-nowrap">{relativeFr(e.at)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
