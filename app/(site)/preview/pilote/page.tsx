import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { buildPiloteFeed } from '@/lib/pilote-feed'
import Sidebar from '@/components/dashboard/Sidebar'
import ModyCompanion from '@/components/dashboard/ModyCompanion'
import PiloteContent from '@/components/dashboard/PiloteContent'
import { PREVIEW_TOKEN, PREVIEW_ADMIN_USER_ID } from '@/lib/preview'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Preview publique TEMPORAIRE du Pilote automatique (lecture seule).
export default async function PreviewPilotePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (token !== PREVIEW_TOKEN) notFound()

  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('id, shop_domain').eq('user_id', PREVIEW_ADMIN_USER_ID)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = storeRow as Pick<Store, 'id' | 'shop_domain'> | null
  if (!store) notFound()

  const entries = await buildPiloteFeed(store.id, supabase)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar shopDomain={store.shop_domain} />
      <main className="flex-1 overflow-y-auto pb-20 min-w-0">
        <div className="sticky top-0 z-30 bg-primary/15 border-b border-primary/30 px-4 sm:px-8 py-2 text-center">
          <p className="text-xs text-primary-bright font-medium">
            👁️ Aperçu Modify — données réelles {store.shop_domain} · lecture seule
          </p>
        </div>
        <PiloteContent entries={entries} />
      </main>
      <ModyCompanion isPro hasAccess />
    </div>
  )
}
