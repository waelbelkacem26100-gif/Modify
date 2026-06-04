'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Euro, Target } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Components { speed: number; content: number; fixes: number; seo: number }
interface Current { score: number; recovered_euros: number; potential_euros: number; components: Components }
interface HistoryPoint { date: string; score: number; recovered: number; potential: number }
interface ScoreData { current: Current | null; history: HistoryPoint[] }

function scoreColor(s: number) {
  if (s >= 80) return '#22c55e'
  if (s >= 50) return '#f59e0b'
  return '#ef4444'
}

const COMPONENT_LABELS: Record<keyof Components, string> = {
  speed: 'Vitesse', content: 'Contenu', fixes: 'Correctifs', seo: 'SEO',
}

export default function GlobalScoreCard() {
  const [data, setData] = useState<ScoreData>({ current: null, history: [] })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/score')
      if (res.ok) setData(await res.json() as ScoreData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const c = data.current
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6 flex items-center justify-center min-h-40">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!c) return null

  const color = scoreColor(c.score)
  const firstRecovered = data.history[0]?.recovered
  const lastRecovered = data.history[data.history.length - 1]?.recovered ?? c.recovered_euros
  const recoveredDelta = firstRecovered != null ? lastRecovered - firstRecovered : null

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 mb-6">
      <div className="grid lg:grid-cols-[auto_1fr] gap-6">
        {/* Left: money + score */}
        <div className="flex items-center gap-6">
          {/* Score dial */}
          <div className="flex flex-col items-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: `conic-gradient(${color} ${c.score * 3.6}deg, #27272a 0deg)` }}
            >
              <div className="w-[5.25rem] h-[5.25rem] rounded-full bg-surface flex flex-col items-center justify-center">
                <span className="font-syne font-bold text-2xl" style={{ color }}>{c.score}</span>
                <span className="text-[9px] text-text-muted uppercase tracking-wide">Score</span>
              </div>
            </div>
          </div>

          {/* € figures */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-text-muted text-xs mb-0.5">
                <Euro className="w-3.5 h-3.5" /> Récupéré par Modify
              </div>
              <p className="font-syne font-bold text-2xl sm:text-3xl text-success">
                €{c.recovered_euros.toLocaleString('fr-FR')}
                {recoveredDelta != null && recoveredDelta > 0 && (
                  <span className="text-success text-xs font-medium ml-2 inline-flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />+€{recoveredDelta.toLocaleString('fr-FR')}
                  </span>
                )}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-text-muted text-xs mb-0.5">
                <Target className="w-3.5 h-3.5" /> Potentiel restant
              </div>
              <p className="font-syne font-bold text-lg text-primary">
                €{c.potential_euros.toLocaleString('fr-FR')}<span className="text-xs font-medium text-text-muted">/mois</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: evolution chart + component bars */}
        <div className="min-w-0">
          {data.history.length > 1 ? (
            <div className="h-28 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#71717a' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#a1a1aa' }}
                    formatter={(v: number) => [`€${v.toLocaleString('fr-FR')}`, 'Récupéré']}
                  />
                  <Area type="monotone" dataKey="recovered" stroke="#22c55e" strokeWidth={2} fill="url(#recoveredGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-text-muted text-xs mb-3">
              L&apos;évolution apparaîtra ici semaine après semaine.
            </p>
          )}

          {/* Component breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(COMPONENT_LABELS) as (keyof Components)[]).map((k) => (
              <div key={k} className="bg-surface-2 border border-border rounded-lg px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text-muted text-[10px] uppercase tracking-wide">{COMPONENT_LABELS[k]}</span>
                  <span className="text-text-secondary text-[10px] font-semibold">{c.components[k]}</span>
                </div>
                <div className="h-1 bg-background rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.components[k]}%`, background: scoreColor(c.components[k]) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
