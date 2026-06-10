import { createServiceRoleClient } from '@/lib/supabase-server'
import type { PlanId } from '@/lib/pricing'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'unpaid'
  plan: PlanId | null
  current_period_end: string | null
  trial_end: string | null
  created_at: string
  updated_at: string
}

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data as Subscription | null
}

export function hasActiveAccess(subscription: Subscription | null): boolean {
  if (!subscription) return false
  return ['active', 'trialing'].includes(subscription.status)
}

// Resolved plan for an active subscriber: 'pro' | 'starter', else 'free'.
export function planFor(subscription: Subscription | null): PlanId {
  if (!hasActiveAccess(subscription)) return 'free'
  return subscription?.plan === 'pro' ? 'pro' : 'starter'
}
