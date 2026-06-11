import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import WinningProductsFeed from '@/components/dashboard/WinningProductsFeed'

export default async function WinningProductsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return <WinningProductsFeed />
}
