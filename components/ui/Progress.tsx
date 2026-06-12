interface ProgressProps {
  /** 0–100 */
  value: number
  className?: string
  /** Bar color class (default: bg-primary) */
  barClassName?: string
}

// Barre de progression du design system — fine, animée, sémantique.
export default function Progress({ value, className = '', barClassName = 'bg-primary' }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={`h-2 bg-surface-2 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
