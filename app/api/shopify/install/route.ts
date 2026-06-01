import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { buildInstallUrl } from '@/lib/shopify'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const shop = request.nextUrl.searchParams.get('shop')
  if (!shop) {
    return new NextResponse('Missing shop parameter', { status: 400 })
  }

  // Validate shop domain
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
  if (!shopRegex.test(shop)) {
    return new NextResponse('Invalid shop domain', { status: 400 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  const installUrl = buildInstallUrl(shop, state)

  const response = NextResponse.redirect(installUrl)

  // Store state + userId in cookie for callback validation
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  response.cookies.set('shopify_oauth_user', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
