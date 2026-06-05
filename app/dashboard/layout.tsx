import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'
import TokenGuard from '@/components/dashboard/TokenGuard'
import { getTokenStatus, type TokenStatus } from '@/lib/shopify-token'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  let shopDomain: string | null = null
  let tokenStatus: TokenStatus = 'valid'
  let reauthKey = 'none'
  if (userId) {
    const supabase = await createServiceRoleClient()
    const { data: store } = await supabase
      .from('stores')
      .select('shop_domain, token_expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (store) {
      shopDomain = store.shop_domain
      tokenStatus = getTokenStatus({ token_expires_at: store.token_expires_at })
      reauthKey = store.token_expires_at ?? 'none'
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar shopDomain={shopDomain} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 min-w-0">
        <TokenGuard shopDomain={shopDomain} status={tokenStatus} reauthKey={reauthKey} />
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
