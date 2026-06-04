import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserSubscription, hasActiveAccess } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import GuidesContent from '@/components/dashboard/GuidesContent'
import SubscribeGate from '@/components/dashboard/SubscribeGate'

export default async function GuidesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (isAdmin(userId)) return <GuidesContent />

  const subscription = await getUserSubscription(userId)
  if (!hasActiveAccess(subscription)) return <SubscribeGate />

  return <GuidesContent />
}
