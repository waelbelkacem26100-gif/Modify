import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'
import TokenGuard from '@/components/dashboard/TokenGuard'
import ModyCompanion from '@/components/dashboard/ModyCompanion'
import { getValidAccessToken, needsReconnect } from '@/lib/shopify-token'
import { getUserSubscription, planFor, hasActiveAccess } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import type { Store } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  let shopDomain: string | null = null
  let reconnect = false
  if (userId) {
    const supabase = await createServiceRoleClient()
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) {
      const store = data as Store
      shopDomain = store.shop_domain
      // Proactively refresh the token server-side on dashboard load (no browser
      // round-trip) so interactive features and crons keep working.
      await getValidAccessToken(store, supabase)
      reconnect = needsReconnect(store)
    }
  }

  // Accès Mody — calculé une fois ici, partagé au compagnon flottant global.
  const admin = userId ? isAdmin(userId) : false
  const subscription = admin || !userId ? null : await getUserSubscription(userId)
  const isPro = admin || planFor(subscription) === 'pro'
  const hasAccess = admin || hasActiveAccess(subscription)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar shopDomain={shopDomain} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 min-w-0">
        <TokenGuard shopDomain={shopDomain} needsReconnect={reconnect} />
        {children}
      </main>
      <MobileNav />
      {/* Compagnon Mody — présent sur 🏠 et 📊, persiste à travers la navigation */}
      {shopDomain && <ModyCompanion isPro={isPro} hasAccess={hasAccess} />}
    </div>
  )
}
