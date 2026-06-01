import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  color?: 'primary' | 'success' | 'warning' | 'default'
}

const colorClasses = {
  primary: 'text-primary bg-primary/10 border-primary/20',
  success: 'text-success bg-success/10 border-success/20',
  warning: 'text-warning bg-warning/10 border-warning/20',
  default: 'text-text-secondary bg-surface-2 border-border',
}

export default function MetricCard({ icon: Icon, label, value, sub, color = 'default' }: MetricCardProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="font-syne font-bold text-2xl text-text-primary">{value}</p>
      {sub && <p className="text-text-muted text-xs mt-1">{sub}</p>}
    </div>
  )
}
