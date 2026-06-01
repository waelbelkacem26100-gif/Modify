'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleManage() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Erreur inconnue')
        setLoading(false)
      }
    } catch {
      setError('Erreur réseau')
      setLoading(false)
    }
  }

  return (
    <div>
      <Button onClick={handleManage} loading={loading} variant="secondary" size="md">
        <ExternalLink className="w-4 h-4" />
        Gérer mon abonnement
      </Button>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  )
}
