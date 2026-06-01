interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  hoverable?: boolean
}

export default function Card({ children, className = '', glow = false, hoverable = false }: CardProps) {
  return (
    <div
      className={[
        'bg-surface border border-border rounded-2xl',
        glow ? 'glow-primary' : '',
        hoverable ? 'transition-all duration-200 hover:border-zinc-600 hover:bg-surface-2' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
