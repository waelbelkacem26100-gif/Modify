import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyShopClaim } from '@/lib/shopify-claim'

export const runtime = 'nodejs'

/**
 * Top-level landing after an embedded install breaks out of the Shopify admin
 * iframe. Claims the shop's store for the now-signed-in Clerk user:
 *
 *  - `token` is a signed proof of shop ownership minted by /token-exchange.
 *  - If the visitor isn't signed into Clerk yet, bounce through sign-in and come
 *    back here (the merchant may need to create a Modify account first).
 *  - Re-assign the store (created during install with the sentinel owner
 *    `shopify:<shop>`) to the real Clerk user, then send them to /dashboard.
 *
 * GET mutates here intentionally: it's a one-shot redirect guarded by a signed,
 * expiring token AND Clerk auth.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const dashboardUrl = new URL('/dashboard', request.url)

  // No/invalid token → nothing to claim; just send them to the dashboard, where
  // they can connect a store manually.
  if (!token) return NextResponse.redirect(dashboardUrl)

  const { userId } = await auth()
  if (!userId) {
    // Bounce through sign-in, returning to this same claim URL afterwards.
    const signInUrl = new URL(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(signInUrl)
  }

  const claim = verifyShopClaim(token)
  if (!claim) return NextResponse.redirect(dashboardUrl)

  try {
    const supabase = await createServiceRoleClient()
    const { data: store } = await supabase
      .from('stores')
      .select('id, user_id')
      .eq('shop_domain', claim.shop)
      .maybeSingle()

    // A valid claim proves this user controls the shop's admin, so re-assigning
    // ownership is safe even if the store currently has the sentinel owner or a
    // stale account. Skip the write if it's already theirs.
    if (store && store.user_id !== userId) {
      await supabase.from('stores').update({ user_id: userId }).eq('id', store.id)
      console.log('[shopify claim] store', claim.shop, 'claimed by', userId, '(was', store.user_id + ')')
    }
  } catch (e) {
    // Don't trap the merchant on an error page — log and continue to the dashboard.
    console.error('[shopify claim] failed for', claim.shop, String(e))
  }

  return NextResponse.redirect(dashboardUrl)
}
