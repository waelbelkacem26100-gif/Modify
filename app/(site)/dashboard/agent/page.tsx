import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserSubscription, planFor } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import AgentChat from '@/components/dashboard/AgentChat'

export default async function AgentPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const isPro = isAdmin(userId) || planFor(await getUserSubscription(userId)) === 'pro'
  return <AgentChat isPro={isPro} />
}
