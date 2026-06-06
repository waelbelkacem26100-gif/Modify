'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  shopDomain: string | null
  needsReconnect: boolean
}

/**
 * Banner shown ONLY when the token can't be refreshed server-side (expired +
 * no refresh_token). Expiring tokens are refreshed automatically on the server
 * (dashboard load + cron), so no banner or redirect loop occurs there.
 */
export default function TokenGuard({ shopDomain, needsReconnect }: Props) {
  if (!needsReconnect || !shopDomain) return null

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
