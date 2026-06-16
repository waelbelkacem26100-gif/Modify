import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { buildPiloteFeed } from '@/lib/pilote-feed'
import PiloteContent from '@/components/dashboard/PiloteContent'
import type { Store } from '@/types'

// ⚙️ Pilote automatique — activité d'automatisation réelle.
export default async function PilotePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('id').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = storeRow as Pick<Store, 'id'> | null
  if (!store) redirect('/dashboard')

  const entries = await buildPiloteFeed(store.id, supabase)
  return <PiloteContent entries={entries} />
}
