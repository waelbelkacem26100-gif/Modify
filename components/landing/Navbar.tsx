'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Zap } from 'lucide-react'

export default function Navbar() {
  const { isSignedIn } = useUser()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-syne font-bold text-lg text-text-primary">Modify</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          <Link href="#how-it-works" className="hover:text-text-primary transition-colors">
            Comment ça marche
          </Link>
          <Link href="#pricing" className="hover:text-text-primary transition-colors">
            Tarifs
          </Link>
        </div>

        <div className="flex items-center gap-3">
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
                className="text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2"
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
      </div>
    </nav>
  )
}
