import { refreshAccessToken } from '@/lib/shopify'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// Refresh once the token has less than this left.
const REFRESH_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 hours

export type TokenStatus = 'valid' | 'expiring' | 'expired'

type TokenFields = Pick<Store, 'token_expires_at' | 'refresh_token'>

/**
 * Shopify now issues EXPIRING offline tokens (with a refresh_token) and rejects
 * the old non-expiring ones. A store with no recorded expiry holds a dead legacy
 * token → treated as expired.
 */
export function getTokenStatus(store: Pick<Store, 'token_expires_at'>): TokenStatus {
  if (!store.token_expires_at) return 'expired'
  const exp = new Date(store.token_expires_at).getTime()
  const now = Date.now()
  if (Number.isNaN(exp) || exp <= now) return 'expired'
  if (exp - now <= REFRESH_WINDOW_MS) return 'expiring'
  return 'valid'
}

/**
 * True only when the token can't be salvaged server-side: it's expired/dead AND
 * there's no refresh token. This is the one case where the merchant must
 * re-authorise (a banner is shown). With a refresh_token we recover silently.
 */
export function needsReconnect(store: TokenFields): boolean {
  return getTokenStatus(store) === 'expired' && !store.refresh_token
}

export function isTokenExpired(store: TokenFields): boolean {
  // For background jobs: "unusable" = expired with no way to refresh.
  return needsReconnect(store)
}

/**
 * Returns a usable access token, refreshing it server-side first if it is
 * expiring/expired and a refresh_token is available. Persists the rotated token
 * + new expiry. Falls back to the current token if no refresh is possible.
 */
export async function getValidAccessToken(store: Store, supabase: SupabaseClient): Promise<string> {
  if (getTokenStatus(store) === 'valid') return store.access_token
  if (!store.refresh_token) return store.access_token // nothing we can do server-side

  try {
    const r = await refreshAccessToken(store.shop_domain, store.refresh_token)
    const expiresAt = r.expiresIn ? new Date(Date.now() + r.expiresIn * 1000).toISOString() : null
    await supabase.from('stores').update({
      access_token: r.accessToken,
      refresh_token: r.refreshToken,
      token_expires_at: expiresAt,
    }).eq('id', store.id)
    // keep the in-memory store object usable for the rest of this request
    store.access_token = r.accessToken
    store.refresh_token = r.refreshToken
    store.token_expires_at = expiresAt
    console.log('[token] refreshed for', store.shop_domain, '| expires_in:', r.expiresIn ?? 'n/a')
    return r.accessToken
  } catch (e) {
    console.error('[token] refresh failed for', store.shop_domain, String(e))
    return store.access_token
  }
}
