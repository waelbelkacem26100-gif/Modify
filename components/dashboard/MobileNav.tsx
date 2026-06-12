'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ScanSearch, Zap, HeartHandshake, BarChart3 } from 'lucide-react'

// Bottom-nav mobile v2 — 4 icônes, touch targets ≥44px.
const navItems = [
  { href: '/dashboard', icon: ScanSearch, label: 'Analyse' },
  { href: '/dashboard/corrections', icon: Zap, label: 'Corrections' },
  { href: '/dashboard/accompagnement', icon: HeartHandshake, label: 'Accompagnement' },
  { href: '/dashboard/resultats', icon: BarChart3, label: 'Résultats' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center justify-center gap-0.5 px-2 rounded-xl transition-colors min-w-0 flex-1 min-h-[48px]',
                isActive ? 'text-primary' : 'text-text-muted',
              ].join(' ')}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-medium truncate w-full text-center leading-tight">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
