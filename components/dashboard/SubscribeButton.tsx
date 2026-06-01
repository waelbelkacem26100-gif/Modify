'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', data.error)
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleSubscribe} loading={loading} size="lg">
      <Zap className="w-4 h-4 fill-white" />
      Démarrer l&apos;essai gratuit — 14 jours
    </Button>
  )
}
