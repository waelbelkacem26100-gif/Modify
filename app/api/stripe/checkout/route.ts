import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createCheckoutSession } from '@/lib/stripe'
import { isPaidPlan } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { plan?: string }
  const plan = isPaidPlan(body.plan) ? body.plan : 'starter'

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  try {
    const url = await createCheckoutSession(userId, email, plan)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
