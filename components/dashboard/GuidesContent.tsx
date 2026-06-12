'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Camera, LayoutTemplate, Megaphone, Lightbulb, Sparkles, ChevronDown, ChevronUp,
  CheckCircle2, Circle,
} from 'lucide-react'
import Button from '@/components/ui/Button'

type GuideType = 'photos' | 'theme_ux' | 'marketing' | 'products'

interface Step { title: string; detail: string; done?: boolean }
interface Guide {
  id: string
  type: GuideType
  title: string
  impact_euros: number
  summary: string
  steps: Step[]
  status: 'todo' | 'done'
  created_at: string
}

const TYPES: { key: GuideType; label: string; desc: string; icon: typeof Camera }[] = [
  { key: 'photos', label: 'Photos produits', desc: 'Brief photo personnalisé', icon: Camera },
  { key: 'theme_ux', label: 'Design & UX', desc: 'Correctifs exacts à copier', icon: LayoutTemplate },
  { key: 'marketing', label: 'Plan marketing', desc: 'Plan de la semaine', icon: Megaphone },
  { key: 'products', label: 'Nouveaux produits', desc: 'Idées selon les tendances', icon: Lightbulb },
]

export default function GuidesContent() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<GuideType | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchGuides = useCallback(async () => {
    const res = await fetch('/api/guides')
    if (res.ok) setGuides((await res.json() as { guides: Guide[] }).guides ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchGuides() }, [fetchGuides])

  async function generate(type: GuideType) {
    setGenerating(type)
    try {
      const res = await fetch('/api/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
      if (res.ok) {
        const d = await res.json() as { guide: Guide }
        setGuides((prev) => [d.guide, ...prev])
        setExpanded((prev) => new Set(prev).add(d.guide.id))
      }
    } finally { setGenerating(null) }
  }

  async function toggleDone(g: Guide) {
    const status = g.status === 'done' ? 'todo' : 'done'
    setGuides((prev) => prev.map((x) => x.id === g.id ? { ...x, status } : x))
    await fetch('/api/guides', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guide_id: g.id, status }) })
  }

  // Checklist interactive : coche une étape — l'état est persisté en base
  // (rechargez la page : il est conservé). Tout coché → guide terminé.
  async function toggleStep(g: Guide, i: number) {
    const done = !g.steps[i]?.done
    setGuides((prev) => prev.map((x) => {
      if (x.id !== g.id) return x
      const steps = x.steps.map((s, j) => j === i ? { ...s, done } : s)
      const allDone = steps.length > 0 && steps.every((s) => s.done)
      return { ...x, steps, status: allDone ? 'done' : 'todo' }
    }))
    await fetch('/api/guides', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guide_id: g.id, step_index: i, done }),
    }).catch(() => {})
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const iconFor = (t: GuideType) => TYPES.find((x) => x.key === t)?.icon ?? Sparkles

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">Accompagnement</h1>
        <p className="text-text-secondary text-sm">
          Ce que Modify ne peut pas appliquer seul, il l&apos;analyse, le chiffre en € et vous guide pas à pas.
        </p>
      </div>

      {/* Generators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => generate(t.key)}
            disabled={generating !== null}
            className="bg-surface border border-border rounded-2xl p-4 text-left hover:border-primary/40 transition-colors disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <t.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="font-medium text-text-primary text-sm">{t.label}</p>
            <p className="text-text-muted text-xs mt-0.5">{t.desc}</p>
            <span className="inline-flex items-center gap-1 text-primary text-xs font-medium mt-2">
              {generating === t.key ? 'Génération…' : <><Sparkles className="w-3 h-3" /> Générer</>}
            </span>
          </button>
        ))}
      </div>

      {/* Guides list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-32">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : guides.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Sparkles className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucune mission encore</h3>
          <p className="text-text-secondary text-sm">Choisissez une catégorie ci-dessus pour générer un guide personnalisé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {guides.map((g) => {
            const Icon = iconFor(g.type)
            const isOpen = expanded.has(g.id)
            return (
              <div key={g.id} className={`bg-surface border rounded-2xl overflow-hidden ${g.status === 'done' ? 'border-success/30' : 'border-border'}`}>
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleDone(g)} className="mt-0.5 flex-shrink-0" title="Marquer comme fait">
                      {g.status === 'done'
                        ? <CheckCircle2 className="w-5 h-5 text-success" />
                        : <Circle className="w-5 h-5 text-text-muted hover:text-text-secondary" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-full">
                          <Icon className="w-3 h-3" /> {TYPES.find((t) => t.key === g.type)?.label}
                        </span>
                        <span className="text-warning text-sm font-semibold ml-auto">€{Number(g.impact_euros).toLocaleString('fr-FR')}/mois</span>
                      </div>
                      <h3 className={`font-medium text-sm ${g.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary'}`}>{g.title}</h3>
                      <p className="text-text-secondary text-xs mt-1 leading-relaxed">{g.summary}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleExpand(g.id)}
                  className="w-full flex items-center justify-between px-5 py-3 border-t border-border text-text-muted hover:text-text-secondary text-xs transition-colors bg-surface-2"
                >
                  <span>
                    {(g.steps ?? []).filter((s) => s.done).length}/{g.steps?.length ?? 0} étapes faites
                  </span>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {isOpen && (
                  <ol className="divide-y divide-border">
                    {(g.steps ?? []).map((s, i) => (
                      <li key={i} className="p-4 flex gap-3">
                        <button onClick={() => toggleStep(g, i)} className="flex-shrink-0 mt-0.5" title={s.done ? 'Décocher' : 'Marquer comme fait'}>
                          {s.done
                            ? <CheckCircle2 className="w-5 h-5 text-success" />
                            : <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">{i + 1}</span>}
                        </button>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${s.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{s.title}</p>
                          <p className={`text-xs mt-0.5 leading-relaxed whitespace-pre-wrap ${s.done ? 'text-text-muted' : 'text-text-secondary'}`}>{s.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
