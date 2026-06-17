'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Home, BarChart3, Gauge, CreditCard } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

// Bottom-nav mobile — reflète les 3 espaces de la sidebar desktop (la sidebar
// est masquée < md, donc tout doit rester atteignable ici). Le compte (gestion
// abonnement + déconnexion Clerk) vit dans le UserButton ; le compagnon Mody
// flottant reste indépendant. Touch targets ≥52px.
const navItems = [
  { href: '/dashboard', icon: Home, label: 'Accueil', match: (p: string) => p === '/dashboard' },
  { href: '/dashboard/pilote', icon: Gauge, label: 'Pilote', match: (p: string) => p.startsWith('/dashboard/pilote') },
  { href: '/dashboard/resultats', icon: BarChart3, label: 'Impact', match: (p: string) => p.startsWith('/dashboard/resultats') },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const isActive = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center justify-center gap-0.5 px-2 rounded-xl transition-colors flex-1 min-h-[52px]',
                isActive ? 'text-primary' : 'text-text-muted',
              ].join(' ')}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}

        {/* Compte — gestion du compte + abonnement + déconnexion (sinon inaccessibles
            sur mobile, la sidebar étant masquée). Lien custom vers l'abonnement. */}
        <div className="flex flex-col items-center justify-center px-2 flex-1 min-h-[52px]">
          <UserButton
            appearance={{
              variables: { colorPrimary: '#8B7BFF' },
              elements: { avatarBox: 'w-6 h-6' },
            }}
          >
            <UserButton.MenuItems>
              <UserButton.Link
                label="Mon abonnement"
                labelIcon={<CreditCard className="w-4 h-4" />}
                href="/dashboard/subscription"
              />
            </UserButton.MenuItems>
          </UserButton>
          <span className="text-[10px] font-medium leading-tight text-text-muted mt-0.5">Compte</span>
        </div>

        {/* Bascule thème — accessible sur mobile (pas de header dédié) */}
        <div className="flex flex-col items-center justify-center px-1 flex-1 min-h-[52px]">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
