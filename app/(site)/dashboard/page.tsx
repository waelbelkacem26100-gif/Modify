import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getUserSubscription, hasActiveAccess } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import StoreConnect from '@/components/dashboard/StoreConnect'
import OnboardingProgress from '@/components/dashboard/OnboardingProgress'
import AnalyseContent from '@/components/dashboard/AnalyseContent'
import ModyAvatar from '@/components/brand/ModyAvatar'
import type { Store, Audit } from '@/types'

// 🔍 Analyse — le point d'entrée : audit complet + score, fusionnés en UNE page.
export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()

  if (!store) {
    return (
      <div className="p-4 sm:p-8">
        {/* Accueil Mody — l'identité v6 dès le premier écran, avant tout audit */}
        <div className="flex items-start gap-4 mb-6 sm:mb-8">
          <ModyAvatar size={52} glow />
          <div className="min-w-0 pt-1">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-1 tracking-tight">
              Bienvenue — moi c’est Mody
            </h1>
            <p className="text-text-secondary text-sm max-w-md">
              Connectez votre boutique et je m’occupe du reste : j’analyse, je corrige,
              et je vous montre exactement ce que ça rapporte.
            </p>
          </div>
        </div>
        <OnboardingProgress hasStore={false} hasCompletedAudit={false} hasAppliedFix={false} />
        <StoreConnect />
      </div>
    )
  }

  const typedStore = store as Store

  // Freemium : tout le monde lance l'analyse ; au-delà de 3 problèmes, flouté.
  const subscription = await getUserSubscription(userId)
  const isSubscribed = isAdmin(userId) || hasActiveAccess(subscription)

  // Dernier audit + score courant
  const { data: latestAudit } = await supabase
    .from('audits').select('*').eq('store_id', typedStore.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const { data: snap } = await supabase
    .from('store_score_snapshots').select('score').eq('store_id', typedStore.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const audit = latestAudit as Audit | null
  const score = snap?.score ?? (audit?.results?.length ? Math.max(35, 100 - audit.results.length * 4) : 60)

  // F1 — premier run : boutique connectée mais AUCUN audit encore lancé.
  const isFirstRun = !audit

  return (
    <AnalyseContent
      isSubscribed={isSubscribed}
      shopDomain={typedStore.shop_domain}
      initialAudit={audit}
      initialScore={score}
      isFirstRun={isFirstRun}
    />
  )
}
