'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import {
  ScanSearch,
  Zap,
  CreditCard,
  Package,
  TrendingUp,
  Newspaper,
  HeartHandshake,
  BarChart3,
  LogOut,
} from 'lucide-react'

// Navigation v2 — 4 sections. Un marchand non-technique comprend tout en 10s.
// `hidden` entries are intentionally kept (pages + code stay intact) but not
// shown in the nav — futur SaaS "Agent Marketing". Flip to re-enable.
const navItems = [
  { href: '/dashboard', icon: ScanSearch, label: 'Analyse' },
  { href: '/dashboard/corrections', icon: Zap, label: 'Corrections' },
  { href: '/dashboard/accompagnement', icon: HeartHandshake, label: 'Accompagnement' },
  { href: '/dashboard/resultats', icon: BarChart3, label: 'Résultats' },
  { href: '/dashboard/winning-products', icon: TrendingUp, label: 'Produits gagnants', hidden: true },
  { href: '/dashboard/products', icon: Package, label: 'Produits', hidden: true },
  { href: '/dashboard/seo', icon: Newspaper, label: 'Contenu SEO', hidden: true },
]

interface Props {
  shopDomain: string | null
}

export default function Sidebar({ shopDomain }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    if (!shopDomain) return
    const ok = window.confirm(
      `Déconnecter ${shopDomain} ?\n\nTous les audits et correctifs associés seront supprimés.`
    )
    if (!ok) return
    setDisconnecting(true)
    try {
      await fetch('/api/shopify/disconnect', { method: 'DELETE' })
      router.push('/dashboard/connect')
      router.refresh()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <aside className="hidden md:flex w-56 bg-surface border-r border-border flex-col h-screen sticky top-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-border hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="font-syne font-bold text-base text-text-primary">Modify</span>
      </Link>

      {/* Store badge + disconnect */}
      {shopDomain && (
        <div className="px-3 pt-3 pb-1">
          <div className="px-3 py-2 bg-surface-2 rounded-xl">
            <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium mb-0.5">Boutique connectée</p>
            <p className="text-xs text-text-primary font-medium truncate">{shopDomain}</p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="mt-1.5 flex items-center gap-1 text-[10px] text-text-muted hover:text-danger transition-colors disabled:opacity-50"
            >
              <LogOut className="w-3 h-3" />
              {disconnecting ? 'Déconnexion…' : 'Déconnecter'}
            </button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {navItems.filter((item) => !item.hidden).map((item) => {
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
              variables: { colorPrimary: '#FF6B35' },
              elements: { avatarBox: 'w-7 h-7' },
            }}
          />
          <span className="text-sm text-text-secondary">Mon compte</span>
        </div>
      </div>
    </aside>
  )
}
