'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart3 } from 'lucide-react'

// Bottom-nav mobile v6 — 2 espaces seulement (le compagnon Mody flottant et le
// menu compte sont ailleurs). Touch targets ≥48px.
const navItems = [
  { href: '/dashboard', icon: Home, label: 'Tableau de bord', match: (p: string) => p === '/dashboard' },
  { href: '/dashboard/resultats', icon: BarChart3, label: 'Impact', match: (p: string) => p.startsWith('/dashboard/resultats') },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center justify-center gap-0.5 px-4 rounded-xl transition-colors flex-1 min-h-[52px]',
                isActive ? 'text-primary' : 'text-text-muted',
              ].join(' ')}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
