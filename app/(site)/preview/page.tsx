import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import Sidebar from '@/components/dashboard/Sidebar'
import ModyCompanion from '@/components/dashboard/ModyCompanion'
import AnalyseContent from '@/components/dashboard/AnalyseContent'
import { PREVIEW_TOKEN, PREVIEW_ADMIN_USER_ID } from '@/lib/preview'
import type { Store, Audit } from '@/types'

export const runtime = 'nodejs'
// Pas de cache : la preview doit refléter l'état réel de la base.
export const dynamic = 'force-dynamic'

/**
 * /preview?token=… — Preview publique TEMPORAIRE du dashboard avec les vraies
 * données AquaDrive, SANS authentification Clerk. Lecture seule.
 *
 * ⚠️ À RETIRER après la démo (voir lib/preview.ts).
 */
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  // Token invalide → 404 (ne révèle pas l'existence de la route).
  if (token !== PREVIEW_TOKEN) notFound()

  const supabase = await createServiceRoleClient()

  // Boutique du propriétaire (AquaDrive est rattachée à ce user_id admin).
  const { data: storeRow } = await supabase
    .from('stores').select('*').eq('user_id', PREVIEW_ADMIN_USER_ID)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = storeRow as Store | null
  if (!store) notFound()

  // Dernier audit + score réel.
  const { data: latestAudit } = await supabase
    .from('audits').select('*').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const audit = latestAudit as Audit | null

  const { data: snap } = await supabase
    .from('store_score_snapshots').select('score').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const score = snap?.score ?? (audit?.results?.length ? Math.max(35, 100 - audit.results.length * 4) : 60)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar shopDomain={store.shop_domain} />
      <main className="flex-1 overflow-y-auto pb-20 min-w-0">
        {/* Ruban preview — lecture seule, données réelles */}
        <div className="sticky top-0 z-30 bg-primary/15 border-b border-primary/30 px-4 sm:px-8 py-2 text-center">
          <p className="text-xs text-primary-bright font-medium">
            👁️ Aperçu Modify — données réelles {store.shop_domain} · lecture seule
          </p>
        </div>
        <AnalyseContent
          isSubscribed
          previewMode
          shopDomain={store.shop_domain}
          initialAudit={audit}
          initialScore={score}
        />
      </main>
      {/* Compagnon Mody (missions en lecture seule via bypass token) */}
      <ModyCompanion isPro hasAccess />
    </div>
  )
}
