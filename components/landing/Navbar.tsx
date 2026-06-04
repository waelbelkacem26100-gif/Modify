'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Zap, Menu, X } from 'lucide-react'

export default function Navbar() {
  const { isSignedIn } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-syne font-bold text-lg text-text-primary">Modify</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          <Link href="#how-it-works" className="hover:text-text-primary transition-colors">
            Comment ça marche
          </Link>
          <Link href="#features" className="hover:text-text-primary transition-colors">
            Automatisation
          </Link>
          <Link href="#pricing" className="hover:text-text-primary transition-colors">
            Tarifs
          </Link>
        </div>

        {/* Desktop CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="text-sm bg-primary hover:bg-primary-dark text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Mon dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2"
              >
                Connexion
              </Link>
              <Link
                href="/sign-up"
                className="text-sm bg-primary hover:bg-primary-dark text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Essai gratuit
              </Link>
            </>
          )}
        </div>

        {/* Mobile: CTA button + hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="text-sm bg-primary text-white font-medium px-3 py-1.5 rounded-lg"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="text-sm bg-primary text-white font-medium px-3 py-1.5 rounded-lg"
            >
              Essai gratuit
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="sm:hidden bg-surface border-t border-border px-4 py-4 space-y-1">
          <Link
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            Comment ça marche
          </Link>
          <Link
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            Automatisation
          </Link>
          <Link
            href="#pricing"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            Tarifs
          </Link>
          {!isSignedIn && (
            <Link
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              Connexion
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
