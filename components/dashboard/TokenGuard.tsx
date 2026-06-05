'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { TokenStatus } from '@/lib/shopify-token'

interface Props {
  shopDomain: string | null
  status: TokenStatus
  reauthKey: string // unique per token (its expiry) — resets the loop guard on refresh
}

export default function TokenGuard({ shopDomain, status, reauthKey }: Props) {
  // Proactive, automatic silent re-authorization while the token is still valid
  // (Shopify won't prompt if the app is already installed with the same scopes).
  useEffect(() => {
    if (status !== 'expiring' || !shopDomain) return
    const key = 'modify_reauth_attempt'
    if (sessionStorage.getItem(key) === reauthKey) return // already tried for this token
    sessionStorage.setItem(key, reauthKey)
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(shopDomain)}`
  }, [status, shopDomain, reauthKey])

  if (status !== 'expired' || !shopDomain) return null

  // Token is dead — Shopify rejects it. One click re-authorises and refreshes it.
  const reconnectUrl = `/api/shopify/install?shop=${encodeURIComponent(shopDomain)}`
  return (
    <div className="sticky top-0 z-30 bg-warning/10 border-b border-warning/30 px-4 sm:px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
        <p className="text-sm text-text-secondary flex-1 min-w-0">
          La connexion à votre boutique a expiré. Reconnectez-vous pour que Modify continue
          en pilote automatique.
        </p>
        <a
          href={reconnectUrl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning text-black text-xs font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reconnecter
        </a>
      </div>
    </div>
  )
}
