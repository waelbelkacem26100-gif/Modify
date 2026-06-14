'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Home, BarChart3, CreditCard, LogOut, ChevronUp, Zap } from 'lucide-react'

// Navigation v6 — 2 espaces seulement. Tout le reste (Corrections, Mody) vit
// dans la page ou dans le compagnon flottant. Le marchand comprend en 5s qu'il
// y a « ce qui se passe maintenant » (🏠) et « ce que ça a rapporté » (📊).
const SPACES = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Tableau de bord',
    match: (p: string) => p === '/dashboard',
  },
  {
    href: '/dashboard/resultats',
    icon: BarChart3,
    label: 'Impact & Résultats',
    match: (p: string) => p.startsWith('/dashboard/resultats'),
  },
]

interface Props {
  shopDomain: string | null
}

export default function Sidebar({ shopDomain }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

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
    <aside className="hidden md:flex w-60 bg-surface border-r border-border flex-col h-screen sticky top-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5 hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-text-primary">Modify</span>
      </Link>

      {/* Store badge */}
      {shopDomain && (
        <div className="px-3 pb-2">
          <div className="px-3 py-2 bg-surface-2 rounded-xl">
            <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium mb-0.5">Boutique connectée</p>
            <p className="text-xs text-text-primary font-medium truncate">{shopDomain}</p>
          </div>
        </div>
      )}

      {/* 2 espaces principaux — grands, explicites */}
      <nav className="flex-1 px-3 py-2 space-y-2">
        {SPACES.map((s) => {
          const active = s.match(pathname)
          return (
            <Link
              key={s.href}
              href={s.href}
              className={[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition-all duration-150',
                active
                  ? 'bg-primary/10 text-text-primary border-primary/30'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-surface-2',
              ].join(' ')}
            >
              <s.icon className={['w-5 h-5 flex-shrink-0', active ? 'text-primary' : ''].join(' ')} />
              <span className="font-display font-semibold text-[15px] leading-tight">{s.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Menu compte — discret, déroulant (pas des liens pleine largeur) */}
      <div className="px-3 py-3 border-t border-border">
        {accountOpen && (
          <div className="mb-2 space-y-1">
            <Link
              href="/dashboard/subscription"
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
                pathname === '/dashboard/subscription'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
              ].join(' ')}
            >
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              Mon abonnement
            </Link>
            {shopDomain && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-danger hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                {disconnecting ? 'Déconnexion…' : 'Déconnecter la boutique'}
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setAccountOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface-2 transition-colors"
        >
          <UserButton
            appearance={{
              variables: { colorPrimary: '#FF6B35' },
              elements: { avatarBox: 'w-7 h-7' },
            }}
          />
          <span className="text-sm text-text-secondary flex-1 text-left">Mon compte</span>
          <ChevronUp className={['w-4 h-4 text-text-muted transition-transform', accountOpen ? '' : 'rotate-180'].join(' ')} />
        </button>
      </div>
    </aside>
  )
}
