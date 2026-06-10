import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserSubscription, hasActiveAccess } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import AuditContent from '@/components/dashboard/AuditContent'

export default async function AuditPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Freemium: everyone can run an analysis and see the first problems; the rest
  // are blurred behind a CTA for non-subscribers (handled inside AuditContent).
  const subscription = await getUserSubscription(userId)
  const isSubscribed = isAdmin(userId) || hasActiveAccess(subscription)

  return <AuditContent isSubscribed={isSubscribed} />
}
