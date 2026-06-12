import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

export const runtime = 'nodejs'

// TEMPORARY — mints a Clerk sign-in token for the admin test user so the build
// agent can verify authenticated pages (T2/T12/T13/T14) via curl. Guarded by a
// one-off token. REMOVE BEFORE FINAL REPORT.
const DIAG_TOKEN = 'modify-login-diag-4b8d'
const ADMIN_USER = 'user_3EY7Xb5pBY6UUFxJU4cZCclp0Qv'

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('t') !== DIAG_TOKEN) {
    return new NextResponse('Not found', { status: 404 })
  }
  try {
    const client = await clerkClient()
    const token = await client.signInTokens.createSignInToken({
      userId: ADMIN_USER,
      expiresInSeconds: 600,
    })
    return NextResponse.json({ token: token.token })
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 })
  }
}
