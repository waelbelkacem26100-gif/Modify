'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ConversionChart from '@/components/dashboard/ConversionChart'
import { Wallet, TrendingUp, Gauge, Wand2, Newspaper, Sparkles, CheckCircle2 } from 'lucide-react'
import type { Conversion } from '@/types'

export interface SuiviData {
  planName: string
  planPrice: number
  recovered: number
  roiMultiple: number
  fixesApplied: number
  articles: number
  winningProducts: number
  currentScore: number
  avgBefore: number
  avgAfter: number
  uplift: number
  firstFixDate?: string
  conversions: Conversion[]
  scoreHistory: { date: string; score: number }[]
  appliedFixes: { id: string; title: string; impact_euros: number; created_at: string }[]
}

function euros(n: number) { return `€${Math.round(n).toLocaleString('fr-FR')}` }

export default function SuiviContent({ d }: { d: SuiviData }) {
  const scoreColor = d.currentScore >= 80 ? '#22c55e' : d.currentScore >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">Vos résultats</h1>
          <p className="text-text-secondary text-sm">Ce que Modify vous a rapporté, en toute transparence — chiffres réels de votre boutique.</p>
        </div>
        <a href="#galerie-impact"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0">
          📸 Voir ce que Modify a changé →
        </a>
      </div>

      {/* ROI hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-6 sm:p-8 mb-6">
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium mb-2">Le retour sur investissement</p>
          <p className="font-syne font-bold text-2xl sm:text-4xl text-white leading-tight">
            Vous payez {d.planPrice > 0 ? `${d.planPrice}€/mois` : '0€'} — Modify vous a rapporté {euros(d.recovered)}
          </p>
          <p className="text-white/85 text-sm mt-3">
            {d.planPrice > 0 && d.roiMultiple >= 1
              ? `Soit ${d.roiMultiple}× votre abonnement récupéré chaque mois.`
              : 'Continuez : chaque correctif appliqué augmente ce montant.'}
          </p>
        </div>
        <div className="absolute -right-8 -bottom-10 w-48 h-48 rounded-full bg-white/10" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { icon: Wallet, label: 'Récupéré', value: euros(d.recovered), color: 'text-success' },
          { icon: TrendingUp, label: 'Conversion', value: d.avgAfter > 0 ? `${(d.avgAfter * 100).toFixed(1)}%` : '—', color: 'text-text-primary' },
          { icon: Gauge, label: 'Score', value: `${d.currentScore}/100`, color: 'text-text-primary' },
          { icon: Wand2, label: 'Correctifs', value: String(d.fixesApplied), color: 'text-text-primary' },
          { icon: Newspaper, label: 'Articles', value: String(d.articles), color: 'text-text-primary' },
          { icon: Sparkles, label: 'Produits gagnants', value: String(d.winningProducts), color: 'text-text-primary' },
        ].map((m) => (
          <div key={m.label} className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1.5"><m.icon className="w-3.5 h-3.5" /> {m.label}</div>
            <p className={`font-syne font-bold text-lg ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Before / after */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-syne font-semibold text-text-primary mb-4">Avant / après Modify</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-text-muted text-xs mb-1">Conversion avant</p>
            <p className="font-syne font-bold text-lg text-text-secondary">{d.avgBefore > 0 ? `${(d.avgBefore * 100).toFixed(1)}%` : '—'}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-1">Conversion après</p>
            <p className="font-syne font-bold text-lg text-success">{d.avgAfter > 0 ? `${(d.avgAfter * 100).toFixed(1)}%` : '—'}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-1">Évolution</p>
            <p className={`font-syne font-bold text-lg ${d.uplift >= 0 ? 'text-success' : 'text-danger'}`}>
              {d.uplift > 0 ? '+' : ''}{d.uplift.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Conversion chart */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-syne font-semibold text-text-primary mb-5">Conversion, semaine après semaine</h2>
        {d.conversions.length > 0 ? (
          <ConversionChart data={d.conversions} fixAppliedDate={d.firstFixDate} />
        ) : (
          <div className="h-56 flex items-center justify-center text-text-muted text-sm text-center px-4">
            Les données de conversion apparaîtront ici après quelques jours de suivi.
          </div>
        )}
      </div>

      {/* Score evolution */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-syne font-semibold text-text-primary mb-5">Évolution de votre score</h2>
        {d.scoreHistory.length > 1 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.scoreHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={scoreColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={scoreColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262A" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#26262A', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }} formatter={(v: number) => [`${v}/100`, 'Score']} />
                <Area type="monotone" dataKey="score" stroke={scoreColor} strokeWidth={2} fill="url(#scoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-text-muted text-sm">L’évolution de votre score apparaîtra ici semaine après semaine.</p>
        )}
      </div>

      {/* Applied fixes + impact */}
      {d.appliedFixes.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-syne font-semibold text-text-primary mb-4">Correctifs appliqués et leur impact</h2>
          <div className="space-y-2">
            {d.appliedFixes.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-start gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm">{f.title}</p>
                    <p className="text-text-muted text-xs">{new Date(f.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <span className="text-success text-sm font-semibold whitespace-nowrap">+{euros(f.impact_euros)}/mois</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-text-secondary text-sm font-medium">Total récupéré</span>
            <span className="font-syne font-bold text-xl text-primary">{euros(d.recovered)}/mois</span>
          </div>
        </div>
      )}
    </div>
  )
}
