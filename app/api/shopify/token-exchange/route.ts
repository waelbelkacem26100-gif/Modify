import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyShopifySessionToken } from '@/lib/shopify-session'
import { signShopClaim } from '@/lib/shopify-claim'
import { exchangeSessionToken, getShopInfo } from '@/lib/shopify'

export const runtime = 'nodejs'

/**
 * Called from the embedded App Bridge surface with a Shopify session token.
 * Exchanges it for an EXPIRING offline access token and stores it. Works
 * without Clerk — the session token authenticates the shop. Creates the store
 * on first run (managed App Store install) or updates an existing one.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { session_token?: string }
  const sessionToken = body.session_token
  if (!sessionToken) return NextResponse.json({ error: 'Missing session_token' }, { status: 400 })

  const verified = verifyShopifySessionToken(sessionToken)
  if (!verified) return NextResponse.json({ error: 'Invalid session token' }, { status: 401 })
  const shop = verified.shop

  try {
    const { accessToken, expiresIn, refreshToken } = await exchangeSessionToken(shop, sessionToken)
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null

    const supabase = await createServiceRoleClient()
    const { data: existing } = await supabase
      .from('stores').select('id').eq('shop_domain', shop).maybeSingle()

    const tokenFields = {
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      refresh_token: refreshToken,
    }

    let storeId = existing?.id ?? null
    if (existing) {
      // Keep the store's existing owner (e.g. a Clerk account) — only refresh the token.
      await supabase.from('stores').update(tokenFields).eq('id', existing.id)
    } else {
      // Managed App Store install: create the store keyed by shop.
      let shopName: string | null = null
      try {
        const info = (await getShopInfo(shop, accessToken)) as { name?: string }
        shopName = info.name ?? null
      } catch { /* tolerant */ }
      const { data: created } = await supabase.from('stores').insert({
        user_id: `shopify:${shop}`, // sentinel owner for App Store installs
        shop_domain: shop,
        shop_name: shopName,
        ...tokenFields,
      }).select('id').single()
      storeId = created?.id ?? null
    }

    // Shopify OFFLINE access tokens (what we request) are non-expiring by design:
    // the exchange returns only `access_token` + `scope`, never `expires_in` or
    // `refresh_token`. Receiving a valid access token IS the success condition —
    // a non-expiring offline token is exactly what an unattended background app
    // needs. `is_expiring` is informational only and must NOT gate the install.
    const isExpiring = Boolean(expiresIn)
    if (storeId) {
      await supabase.from('audit_logs').insert({
        store_id: storeId,
        action: 'token_exchange',
        details: {
          token_prefix: accessToken.slice(0, 8),
          expires_in: expiresIn ?? null,
          has_refresh_token: Boolean(refreshToken),
          is_expiring: isExpiring,
          created: !existing,
        },
        status: 'success',
      })
    }

    console.log('[token-exchange] ok', shop, '| created:', !existing,
      '| expires_in:', expiresIn ?? 'n/a (non-expiring offline token)',
      '| refresh:', refreshToken ? 'yes' : 'no')
    // Signed proof of shop ownership (we just verified the session token for
    // `shop`). The embedded surface forwards this to /api/shopify/claim so the
    // Clerk user signing in can claim a sentinel store without a trustable shop
    // param. Null only if the signing secret is missing (then no auto-claim).
    const claimToken = signShopClaim(shop)

    return NextResponse.json({
      success: true,
      created: !existing,
      expires_in: expiresIn,
      is_expiring: isExpiring,
      token_prefix: accessToken.slice(0, 6),
      claim_token: claimToken,
    })
  } catch (e) {
    console.error('[token-exchange] failed for', shop, String(e))
    return NextResponse.json({ error: 'Token exchange failed', detail: String(e).slice(0, 200) }, { status: 502 })
  }
}
