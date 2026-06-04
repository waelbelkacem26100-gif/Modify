'use client'

import { useState, useEffect, useCallback } from 'react'
import { ImageDown, Zap, CheckCircle2, Gauge } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Stats {
  optimized: number
  saved_mb: number
}

interface RunResult {
  optimized: number
  scanned: number
  savedMb: number
  estimatedImpactEuros: number
}

export default function ImageOptimizer() {
  const [stats, setStats] = useState<Stats>({ optimized: 0, saved_mb: 0 })
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/images/compress')
    if (res.ok) setStats(await res.json() as Stats)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  async function run() {
    setRunning(true)
    setLastRun(null)
    try {
      const res = await fetch('/api/images/compress', { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as RunResult
        setLastRun(data)
        await fetchStats()
      }
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ImageDown className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-syne font-semibold text-text-primary text-sm">Compression des images</h3>
          <p className="text-text-secondary text-xs mt-0.5">
            Modify détecte les images produit &gt; 500 Ko et les recompresse automatiquement (chaque semaine).
            Des images plus légères = pages plus rapides = plus de conversions.
          </p>
        </div>
        <Button onClick={run} loading={running} size="sm" variant="secondary" className="flex-shrink-0">
          <Zap className="w-3.5 h-3.5" />
          Compresser
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-surface-2 border border-border rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Images optimisées
          </div>
          <p className="font-syne font-bold text-lg text-text-primary">{stats.optimized}</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <Gauge className="w-3.5 h-3.5" /> Poids économisé
          </div>
          <p className="font-syne font-bold text-lg text-success">{stats.saved_mb} Mo</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <Zap className="w-3.5 h-3.5" /> Impact estimé
          </div>
          <p className="font-syne font-bold text-lg text-warning">
            €{lastRun ? lastRun.estimatedImpactEuros : Math.round(stats.saved_mb * 5)}/mois
          </p>
        </div>
      </div>

      {lastRun && (
        <p className="text-success text-xs mt-3">
          ✓ {lastRun.optimized} image(s) compressée(s) sur {lastRun.scanned} scannée(s) — {lastRun.savedMb} Mo économisés.
        </p>
      )}
    </div>
  )
}
