'use client'

import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { DomainScore } from '@/components/dashboard/SuiviContent'

/** Couleur d'une barre selon le score (design system v9). */
function barColor(score: number): string {
  if (score >= 70) return '#8B7BFF'                  // primary — sain
  if (score >= 50) return 'rgba(139, 123, 255, 0.6)' // primary atténué — moyen
  return '#EF4444'                                    // danger — faible
}

function euros(n: number) {
  return `${Math.round(Math.abs(n)).toLocaleString('fr-FR')}€`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DomainTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as DomainScore
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 shadow-xl text-xs">
      <p className="font-medium text-text-primary mb-0.5">{d.label}</p>
      <p className="text-text-secondary">Score : <span className="text-text-primary font-semibold">{d.score}/100</span></p>
      <p className="text-text-secondary">
        Impact :{' '}
        <span className={d.impact < 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>
          {d.impact < 0 ? '-' : '+'}{euros(d.impact)}/mois
        </span>
      </p>
    </div>
  )
}

/**
 * 📊 Scores par domaine — barres horizontales (v10.1).
 *
 * BarChart vertical Recharts : 7 domaines d'audit en Y, score 0–100 en X.
 * Données 100 % réelles (dérivées du dernier audit). S'adapte dark/light :
 * les textes d'axe utilisent `currentColor` (piloté par text-text-secondary).
 */
export default function DomainChart({ domains }: { domains: DomainScore[] }) {
  if (!domains.length) return null

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
      <h2 className="font-syne font-semibold text-text-primary mb-1">Score par domaine</h2>
      <p className="text-text-muted text-xs mb-5">
        Issu de votre dernier audit — survolez une barre pour le détail.
      </p>
      <div className="h-[250px] sm:h-[300px] text-text-secondary">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={domains}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            barCategoryGap="22%"
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} content={<DomainTooltip />} />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={26}>
              {domains.map((d) => (
                <Cell key={d.key} fill={barColor(d.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
