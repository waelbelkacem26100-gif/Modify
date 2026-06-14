'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import type { Conversion } from '@/types'

interface ConversionChartProps {
  data: Conversion[]
  fixAppliedDate?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-3 shadow-xl">
      <p className="text-text-muted text-xs mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary text-xs">{entry.name}:</span>
          <span className="text-text-primary text-xs font-medium">
            {entry.name === 'Taux' ? `${((entry.value ?? 0) * 100).toFixed(2)}%` : `€${entry.value}`}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ConversionChart({ data, fixAppliedDate }: ConversionChartProps) {
  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    Taux: d.conversion_rate,
    Revenus: d.revenue,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#26262A" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#71717A', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#71717A', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        {fixAppliedDate && (
          <ReferenceLine
            x={new Date(fixAppliedDate).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
            })}
            stroke="#8B7BFF"
            strokeDasharray="4 4"
            label={{ value: 'Correctifs appliqués', fill: '#8B7BFF', fontSize: 10 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="Taux"
          stroke="#8B7BFF"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#8B7BFF', stroke: '#0D0D0F', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
