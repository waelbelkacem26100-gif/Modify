'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard,
  ScanSearch,
  Wand2,
  BarChart3,
  Zap,
  CreditCard,
  Package,
  Home,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: "Vue d'ensemble" },
  { href: '/dashboard/audit', icon: ScanSearch, label: 'Audit IA' },
  { href: '/dashboard/fixes', icon: Wand2, label: 'Correctifs' },
  { href: '/dashboard/products', icon: Package, label: 'Produits' },
  { href: '/dashboard/tracking', icon: BarChart3, label: 'Suivi' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-56 bg-surface border-r border-border flex-col h-screen sticky top-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-border hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="font-syne font-bold text-base text-text-primary">Modify</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
              ].join(' ')}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-text-secondary hover:text-text-primary hover:bg-surface-2"
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          Accueil
        </Link>
        <Link
          href="/dashboard/subscription"
          className={[
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
            pathname === '/dashboard/subscription'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
          ].join(' ')}
        >
          <CreditCard className="w-4 h-4 flex-shrink-0" />
          Mon abonnement
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <UserButton
            appearance={{
              variables: { colorPrimary: '#FF5C35' },
              elements: {
                avatarBox: 'w-7 h-7',
              },
            }}
          />
          <span className="text-sm text-text-secondary">Mon compte</span>
        </div>
      </div>
    </aside>
  )
}
