'use client'

import { useState, useEffect, useCallback } from 'react'
import { Gauge, Zap, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Button from '@/components/ui/Button'

interface Latest {
  score: number
  lcp_ms: number
  cls: number
  tbt_ms: number
  opportunities?: { id: string; title: string; savingsMs: number }[]
}
interface HistoryPoint { date: string; score: number }
interface PsData { latest: Latest | null; history: HistoryPoint[] }

function scoreColor(s: number) {
  if (s >= 90) return '#22c55e'
  if (s >= 50) return '#f59e0b'
  return '#ef4444'
}

export default function PageSpeedCard() {
  const [data, setData] = useState<PsData>({ latest: null, history: [] })
  const [testing, setTesting] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/pagespeed')
    if (res.ok) setData(await res.json() as PsData)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function test() {
    setTesting(true)
    try {
      const res = await fetch('/api/pagespeed', { method: 'POST' })
      if (res.ok) await fetchData()
    } finally {
      setTesting(false)
    }
  }

  const latest = data.latest
  const score = latest?.score ?? null
  const color = score != null ? scoreColor(score) : '#71717a'

  const first = data.history[0]?.score
  const last = data.history[data.history.length - 1]?.score
  const delta = first != null && last != null ? last - first : null

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gauge className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="font-syne font-semibold text-text-primary text-sm">Vitesse mobile (Google Lighthouse)</h2>
            <p className="text-text-secondary text-xs">Mesure réelle, suivie semaine après semaine.</p>
          </div>
        </div>
        <Button onClick={test} loading={testing} size="sm" variant="secondary">
          <Zap className="w-3.5 h-3.5" />
          Tester
        </Button>
      </div>

      {score == null ? (
        <p className="text-text-muted text-sm py-6 text-center">
          Aucune mesure encore — lancez un audit ou cliquez « Tester ».
        </p>
      ) : (
        <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
          {/* Score dial */}
          <div className="flex flex-col items-center justify-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--surface-2, #27272a) 0deg)` }}
            >
              <div className="w-[5.25rem] h-[5.25rem] rounded-full bg-surface flex items-center justify-center">
                <span className="font-syne font-bold text-2xl" style={{ color }}>{score}</span>
              </div>
            </div>
            {delta != null && delta !== 0 && (
              <span className={`mt-2 text-xs font-medium flex items-center gap-1 ${delta > 0 ? 'text-success' : 'text-danger'}`}>
                <TrendingUp className={`w-3 h-3 ${delta < 0 ? 'rotate-180' : ''}`} />
                {delta > 0 ? '+' : ''}{delta} pts
              </span>
            )}
          </div>

          {/* Metrics + chart */}
          <div className="min-w-0">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Metric label="LCP" value={`${(latest!.lcp_ms / 1000).toFixed(1)}s`} good={latest!.lcp_ms <= 2500} />
              <Metric label="CLS" value={`${latest!.cls}`} good={latest!.cls <= 0.1} />
              <Metric label="TBT" value={`${latest!.tbt_ms}ms`} good={latest!.tbt_ms <= 200} />
            </div>
            {data.history.length > 1 && (
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.history} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#71717a' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Line type="monotone" dataKey="score" stroke={color} strokeWidth={2} dot={{ r: 2 }} name="Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {latest?.opportunities && latest.opportunities.length > 0 && score != null && score < 90 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-text-muted text-xs font-medium mb-2">Principales optimisations détectées</p>
          <div className="flex flex-wrap gap-2">
            {latest.opportunities.slice(0, 4).map((o) => (
              <span key={o.id} className="text-xs px-2 py-1 rounded-lg bg-surface-2 text-text-secondary">
                {o.title} <span className="text-warning">−{(o.savingsMs / 1000).toFixed(1)}s</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-2.5 py-2">
      <p className="text-text-muted text-[10px] uppercase tracking-wide">{label}</p>
      <p className={`font-semibold text-sm ${good ? 'text-success' : 'text-warning'}`}>{value}</p>
    </div>
  )
}
