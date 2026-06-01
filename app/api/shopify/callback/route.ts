import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { validateHmac, exchangeCodeForToken, getShopInfo } from '@/lib/shopify'

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const { code, shop, state, hmac } = params

  // Validate required params
  if (!code || !shop || !state || !hmac) {
    return new NextResponse('Missing required parameters', { status: 400 })
  }

  // Validate HMAC signature
  if (!validateHmac(params)) {
    return new NextResponse('Invalid HMAC signature', { status: 403 })
  }

  // Validate state (anti-CSRF)
  const cookieState = request.cookies.get('shopify_oauth_state')?.value
  const userId = request.cookies.get('shopify_oauth_user')?.value

  if (!cookieState || state !== cookieState) {
    return new NextResponse('Invalid state parameter', { status: 403 })
  }

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(shop, code)

    // Get shop info
    const shopInfo = await getShopInfo(shop, accessToken) as { name?: string; plan_display_name?: string }

    // Store in Supabase
    const supabase = await createServiceRoleClient()

    const { error } = await supabase.from('stores').upsert(
      {
        user_id: userId,
        shop_domain: shop,
        access_token: accessToken,
        shop_name: shopInfo.name ?? null,
        plan: shopInfo.plan_display_name ?? null,
      },
      { onConflict: 'shop_domain' }
    )

    if (error) {
      console.error('Supabase error:', error)
      return new NextResponse('Failed to save store', { status: 500 })
    }

    // Redirect to dashboard, clear cookies
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.delete('shopify_oauth_state')
    response.cookies.delete('shopify_oauth_user')

    return response
  } catch (err) {
    console.error('OAuth callback error:', err)
    return new NextResponse('OAuth flow failed', { status: 500 })
  }
}
