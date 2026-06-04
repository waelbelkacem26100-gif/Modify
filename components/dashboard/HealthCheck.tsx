'use client'

import { useState } from 'react'
import { Stethoscope, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

type CheckStatus = 'ok' | 'warn' | 'fail'
interface Check { name: string; status: CheckStatus; detail: string }
interface Report { connected: boolean; checks: Check[]; okCount: number; warnCount: number; failCount: number }

const ICON: Record<CheckStatus, typeof CheckCircle2> = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle }
const COLOR: Record<CheckStatus, string> = { ok: 'text-success', warn: 'text-warning', fail: 'text-danger' }

export default function HealthCheck() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function run() {
    setLoading(true)
    setOpen(true)
    try {
      const res = await fetch('/api/health')
      if (res.ok) setReport(await res.json() as Report)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
      <button
        onClick={() => (report ? setOpen((o) => !o) : run())}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-2 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-4 h-4 text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium">Diagnostic de la boutique</p>
          <p className="text-text-muted text-xs">
            {report
              ? `${report.okCount} OK · ${report.warnCount} avertissement(s) · ${report.failCount} erreur(s)`
              : 'Vérifie toutes les intégrations (Shopify, IA, email, base de données)'}
          </p>
        </div>
        {loading
          ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          : report ? (open ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />)
          : <span className="text-primary text-xs font-medium">Lancer</span>}
      </button>

      {open && report && (
        <div className="border-t border-border divide-y divide-border">
          {report.checks.map((c) => {
            const Icon = ICON[c.status]
            return (
              <div key={c.name} className="flex items-start gap-3 px-4 py-3">
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${COLOR[c.status]}`} />
                <div className="min-w-0">
                  <p className="text-text-primary text-sm">{c.name}</p>
                  <p className="text-text-muted text-xs">{c.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
