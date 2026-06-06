import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyShopifySessionToken } from '@/lib/shopify-session'
import { exchangeSessionToken } from '@/lib/shopify'

export const runtime = 'nodejs'

/**
 * Called from the embedded App Bridge surface with a Shopify session token.
 * Exchanges it for an EXPIRING offline access token and refreshes the store's
 * token. Works without Clerk (the session token itself authenticates the shop);
 * the store must already exist (created via the OAuth connect flow).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { session_token?: string }
  const sessionToken = body.session_token
  if (!sessionToken) return NextResponse.json({ error: 'Missing session_token' }, { status: 400 })

  const verified = verifyShopifySessionToken(sessionToken)
  if (!verified) return NextResponse.json({ error: 'Invalid session token' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const { data: store } = await supabase
    .from('stores').select('id').eq('shop_domain', verified.shop).maybeSingle()

  if (!store) {
    return NextResponse.json({ error: 'Store not connected — connectez d\'abord la boutique', code: 'NO_STORE' }, { status: 404 })
  }

  try {
    const { accessToken, expiresIn, refreshToken } = await exchangeSessionToken(verified.shop, sessionToken)
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null

    await supabase.from('stores').update({
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      refresh_token: refreshToken,
    }).eq('id', store.id)

    console.log('[token-exchange] refreshed', verified.shop, '| expires_in:', expiresIn ?? 'n/a', '| refresh:', refreshToken ? 'yes' : 'no')
    return NextResponse.json({ success: true, expires_in: expiresIn })
  } catch (e) {
    console.error('[token-exchange] failed for', verified.shop, String(e))
    return NextResponse.json({ error: 'Token exchange failed', detail: String(e).slice(0, 200) }, { status: 502 })
  }
}
