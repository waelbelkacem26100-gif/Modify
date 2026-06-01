type BadgeVariant = 'high' | 'medium' | 'low' | 'applied' | 'pending' | 'rolled_back' | 'running' | 'completed' | 'failed' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  high: 'bg-danger/10 text-danger border-danger/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-success/10 text-success border-success/20',
  applied: 'bg-success/10 text-success border-success/20',
  pending: 'bg-zinc-800 text-text-secondary border-zinc-700',
  rolled_back: 'bg-warning/10 text-warning border-warning/20',
  running: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20',
  failed: 'bg-danger/10 text-danger border-danger/20',
  default: 'bg-surface-2 text-text-secondary border-border',
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
