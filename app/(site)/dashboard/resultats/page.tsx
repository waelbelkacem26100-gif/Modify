import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getUserSubscription, planFor } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import { buildSuiviData } from '@/lib/suivi-data'
import SuiviContent from '@/components/dashboard/SuiviContent'
import ProofsContent from '@/components/proofs/ProofsContent'
import type { Store } from '@/types'

// 📊 Résultats — ROI, suivi conversion, rapports.
export default async function ResultatsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = storeRow as Store | null
  if (!store) {
    return <div className="p-8 text-center text-text-secondary text-sm">Connectez une boutique pour voir vos résultats.</div>
  }

  const subscription = await getUserSubscription(userId)
  const plan = isAdmin(userId) ? 'pro' : planFor(subscription)
  const data = await buildSuiviData(store, plan, supabase)

  // 📊 Impact & Résultats (v7) — la Galerie des preuves est passée à SuiviContent
  // pour s'afficher juste après les métriques, AVANT les graphiques.
  return <SuiviContent d={data} gallery={<ProofsContent embedded />} />
}
