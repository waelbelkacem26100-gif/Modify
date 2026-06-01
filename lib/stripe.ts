import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? ''

export async function createCheckoutSession(userId: string, email: string): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Modify — Conversion Optimization',
            description: "Accès illimité à tous les outils d'optimisation Shopify",
          },
          unit_amount: 4900,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    subscription_data: { trial_period_days: 14 },
    metadata: { user_id: userId },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
  })

  if (!session.url) throw new Error('Failed to create checkout session')
  return session.url
}
