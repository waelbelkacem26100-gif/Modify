'use client'

import { useState } from 'react'
import { Store, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function StoreConnect() {
  const [shopDomain, setShopDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleConnect() {
    const raw = shopDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!raw) {
      setError('Entrez votre domaine Shopify')
      return
    }

    const domain = raw.includes('.myshopify.com') ? raw : `${raw}.myshopify.com`
    setLoading(true)
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(domain)}`
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Store className="w-7 h-7 text-primary" />
        </div>

        <h2 className="font-syne font-bold text-2xl text-text-primary mb-2">
          Connectez votre boutique
        </h2>
        <p className="text-text-secondary text-sm mb-8 leading-relaxed">
          Entrez votre domaine Shopify — la connexion prend moins de 2 minutes.
          Connexion sécurisée par Shopify — vous gardez le contrôle et pouvez révoquer l’accès à tout moment.
        </p>

        <div className="space-y-3">
          <div className="flex items-center bg-surface-2 border border-border rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors">
            <span className="px-3 text-text-muted text-sm whitespace-nowrap">https://</span>
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => {
                setShopDomain(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              placeholder="ma-boutique.myshopify.com"
              className="flex-1 bg-transparent py-3 pr-3 text-text-primary text-sm outline-none placeholder:text-text-muted"
            />
          </div>

          {error && <p className="text-danger text-xs">{error}</p>}

          <Button
            onClick={handleConnect}
            loading={loading}
            size="lg"
            className="w-full"
          >
            Connecter ma boutique
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="mt-5 text-text-muted text-xs">
          Accès révocable à tout moment · Données chiffrées en transit
        </p>
      </div>
    </div>
  )
}
