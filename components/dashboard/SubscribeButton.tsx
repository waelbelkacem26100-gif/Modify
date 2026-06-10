'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { PaidPlanId } from '@/lib/pricing'

export default function SubscribeButton({
  plan = 'starter',
  label,
  size = 'lg',
}: {
  plan?: PaidPlanId
  label?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
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
    <Button onClick={handleSubscribe} loading={loading} size={size} className="w-full">
      <Zap className="w-4 h-4 fill-white" />
      {label ?? 'Démarrer l’essai gratuit — 14 jours'}
    </Button>
  )
}
