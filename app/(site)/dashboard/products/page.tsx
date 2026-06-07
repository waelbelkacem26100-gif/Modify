import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserSubscription, hasActiveAccess } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import ProductsContent from '@/components/dashboard/ProductsContent'
import SubscribeGate from '@/components/dashboard/SubscribeGate'

export default async function ProductsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (isAdmin(userId)) return <ProductsContent />

  const subscription = await getUserSubscription(userId)
  if (!hasActiveAccess(subscription)) return <SubscribeGate />

  return <ProductsContent />
}
