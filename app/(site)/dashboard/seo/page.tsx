import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserSubscription, hasActiveAccess } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import SeoContent from '@/components/dashboard/SeoContent'
import SubscribeGate from '@/components/dashboard/SubscribeGate'

export default async function SeoPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (isAdmin(userId)) return <SeoContent />

  const subscription = await getUserSubscription(userId)
  if (!hasActiveAccess(subscription)) return <SubscribeGate />

  return <SeoContent />
}
