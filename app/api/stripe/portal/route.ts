import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { getUserSubscription } from '@/lib/subscription'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const subscription = await getUserSubscription(userId)

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Aucun abonnement Stripe trouvé' },
      { status: 404 }
    )
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return NextResponse.json(
      { error: 'Impossible de créer la session portail' },
      { status: 500 }
    )
  }
}
