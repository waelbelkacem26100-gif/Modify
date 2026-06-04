'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ScanSearch, Wand2, BarChart3, Package, Newspaper } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/dashboard/audit', icon: ScanSearch, label: 'Audit' },
  { href: '/dashboard/fixes', icon: Wand2, label: 'Correctifs' },
  { href: '/dashboard/products', icon: Package, label: 'Produits' },
  { href: '/dashboard/seo', icon: Newspaper, label: 'SEO' },
  { href: '/dashboard/tracking', icon: BarChart3, label: 'Suivi' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-colors min-w-0 flex-1',
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
