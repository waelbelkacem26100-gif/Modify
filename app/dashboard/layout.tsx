import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  let shopDomain: string | null = null
  if (userId) {
    const supabase = await createServiceRoleClient()
    const { data: store } = await supabase
      .from('stores')
      .select('shop_domain')
      .eq('user_id', userId)
      .limit(1)
      .single()
    shopDomain = store?.shop_domain ?? null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar shopDomain={shopDomain} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 min-w-0">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
