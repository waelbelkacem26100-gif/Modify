'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface Props {
  shopDomain: string
}

export default function DisconnectStoreButton({ shopDomain }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDisconnect() {
    const confirmed = window.confirm(
      `Déconnecter ${shopDomain} ?\n\nTous les audits et correctifs associés seront supprimés.`
    )
    if (!confirmed) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/shopify/disconnect', { method: 'DELETE' })
      if (!res.ok) {
        setError('Erreur lors de la déconnexion')
        return
      }
      router.push('/dashboard/connect')
      router.refresh()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
      >
        <LogOut className="w-3.5 h-3.5" />
        {loading ? 'Déconnexion…' : `Déconnecter ${shopDomain}`}
      </button>
      {error && <p className="text-danger text-xs mt-1 px-3">{error}</p>}
    </div>
  )
}
