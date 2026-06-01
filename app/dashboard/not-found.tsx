import Link from 'next/link'
import { SearchX, LayoutDashboard } from 'lucide-react'

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 bg-surface-2 border border-border rounded-2xl flex items-center justify-center mx-auto mb-6">
          <SearchX className="w-7 h-7 text-text-muted" />
        </div>

        <h1 className="font-syne font-bold text-xl text-text-primary mb-2">
          Page introuvable
        </h1>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Retour au dashboard
        </Link>
      </div>
    </div>
  )
}
