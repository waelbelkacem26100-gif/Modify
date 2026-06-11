import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getUserSubscription, planFor } from '@/lib/subscription'
import { planById } from '@/lib/pricing'
import { isAdmin } from '@/lib/config'
import SuiviContent, { type SuiviData } from '@/components/dashboard/SuiviContent'
import type { Store, Conversion, Fix } from '@/types'

export default async function SuiviPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = storeRow as Store | null
  if (!store) {
    return <div className="p-8 text-center text-text-secondary text-sm">Connectez une boutique pour voir votre suivi.</div>
  }

  // Plan / price
  const subscription = await getUserSubscription(userId)
  const plan = isAdmin(userId) ? 'pro' : planFor(subscription)
  const planMeta = planById(plan)

  // Conversions since install (cap 120 days)
  const since = new Date(Math.max(new Date(store.created_at).getTime(), Date.now() - 120 * 864e5))
    .toISOString().split('T')[0]
  const { data: conv } = await supabase
    .from('conversions').select('*').eq('store_id', store.id)
    .gte('date', since).order('date', { ascending: true })
  const conversions = (conv ?? []) as Conversion[]
  const mid = Math.floor(conversions.length / 2)
  const avg = (arr: Conversion[]) => arr.length ? arr.reduce((s, c) => s + c.conversion_rate, 0) / arr.length : 0
  const avgBefore = avg(conversions.slice(0, mid))
  const avgAfter = avg(conversions.slice(mid))
  const uplift = avgBefore > 0 ? ((avgAfter - avgBefore) / avgBefore) * 100 : 0

  // All applied fixes (across every audit) + impact
  const { data: audits } = await supabase.from('audits').select('id').eq('store_id', store.id)
  const auditIds = (audits ?? []).map((a: { id: string }) => a.id)
  const { data: fixesRows } = auditIds.length
    ? await supabase.from('fixes').select('id, title, impact_euros, created_at, status')
        .in('audit_id', auditIds).eq('status', 'applied').order('impact_euros', { ascending: false })
    : { data: [] }
  const appliedFixes = ((fixesRows ?? []) as Pick<Fix, 'id' | 'title' | 'impact_euros' | 'created_at' | 'status'>[])
    .map((f) => ({ id: f.id, title: f.title, impact_euros: f.impact_euros, created_at: f.created_at }))
  const recovered = appliedFixes.reduce((s, f) => s + f.impact_euros, 0)
  const firstFixDate = appliedFixes.length
    ? [...appliedFixes].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0].created_at
    : undefined

  // Score history
  const { data: snaps } = await supabase
    .from('store_score_snapshots').select('score, created_at').eq('store_id', store.id)
    .order('created_at', { ascending: true }).limit(26)
  const scoreHistory = ((snaps ?? []) as { score: number; created_at: string }[])
    .map((s) => ({ date: new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), score: s.score }))
  const currentScore = scoreHistory.length ? scoreHistory[scoreHistory.length - 1].score : 0

  // Articles + winning products
  const { count: articles } = await supabase.from('blog_articles').select('id', { count: 'exact', head: true }).eq('store_id', store.id)
  const { count: winningProducts } = await supabase.from('winning_products').select('id', { count: 'exact', head: true }).eq('store_id', store.id)

  const data: SuiviData = {
    planName: planMeta.name,
    planPrice: planMeta.priceEur,
    recovered,
    roiMultiple: planMeta.priceEur > 0 ? Math.round(recovered / planMeta.priceEur) : 0,
    fixesApplied: appliedFixes.length,
    articles: articles ?? 0,
    winningProducts: winningProducts ?? 0,
    currentScore,
    avgBefore,
    avgAfter,
    uplift,
    firstFixDate,
    conversions,
    scoreHistory,
    appliedFixes,
  }

  return <SuiviContent d={data} />
}
