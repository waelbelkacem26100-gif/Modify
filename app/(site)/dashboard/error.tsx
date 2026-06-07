'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import Button from '@/components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-7 h-7 text-danger" />
        </div>

        <h1 className="font-syne font-bold text-xl text-text-primary mb-2">
          Une erreur s&apos;est produite
        </h1>
        <p className="text-text-secondary text-sm mb-1 leading-relaxed">
          Quelque chose s&apos;est mal passé lors du chargement de cette page.
        </p>
        {error.digest && (
          <p className="text-text-muted text-xs mb-6 font-mono">
            Référence : {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} variant="secondary" size="md">
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Retour au dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
