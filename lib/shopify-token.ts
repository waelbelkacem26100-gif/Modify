import type { Store } from '@/types'

// Refresh proactively once the token has less than this left.
const REFRESH_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 hours

export type TokenStatus = 'valid' | 'expiring' | 'expired'

/**
 * Shopify now issues EXPIRING offline tokens and rejects the old non-expiring
 * ones. A store with no recorded expiry is therefore treated as expired
 * (its token is a dead legacy token and must be re-authorised).
 */
export function getTokenStatus(store: Pick<Store, 'token_expires_at'>): TokenStatus {
  if (!store.token_expires_at) return 'expired'
  const exp = new Date(store.token_expires_at).getTime()
  const now = Date.now()
  if (Number.isNaN(exp) || exp <= now) return 'expired'
  if (exp - now <= REFRESH_WINDOW_MS) return 'expiring'
  return 'valid'
}

export function isTokenExpired(store: Pick<Store, 'token_expires_at'>): boolean {
  return getTokenStatus(store) === 'expired'
}
