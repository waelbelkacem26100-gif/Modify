import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserSubscription, planFor, hasActiveAccess } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import AccompagnementContent from '@/components/dashboard/AccompagnementContent'

// 🤝 Accompagnement — l'agent assistant (interface principale) + les guides
// personnalisés avec leur progression, fusionnés sur une seule page.
export default async function AccompagnementPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const admin = isAdmin(userId)
  const subscription = admin ? null : await getUserSubscription(userId)
  const isPro = admin || planFor(subscription) === 'pro'
  const hasAccess = admin || hasActiveAccess(subscription)

  return <AccompagnementContent isPro={isPro} hasAccess={hasAccess} />
}
