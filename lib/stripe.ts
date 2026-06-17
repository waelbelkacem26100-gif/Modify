import Stripe from 'stripe'
import { PLANS, TRIAL_DAYS, type PaidPlanId } from '@/lib/pricing'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: PaidPlanId = 'starter'
): Promise<string> {
  const p = PLANS[plan]
  if (!p.stripePriceId) throw new Error(`No Stripe price configured for plan "${plan}"`)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price: p.stripePriceId,
        quantity: 1,
      },
    ],
    subscription_data: { trial_period_days: TRIAL_DAYS, metadata: { user_id: userId, plan } },
    metadata: { user_id: userId, plan },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
  })

  if (!session.url) throw new Error('Failed to create checkout session')
  return session.url
}
