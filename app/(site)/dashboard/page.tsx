import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase-server'
import StoreConnect from '@/components/dashboard/StoreConnect'
import OnboardingProgress from '@/components/dashboard/OnboardingProgress'
import { timelineEntry, nextMaintenanceLabel } from '@/lib/fix-presentation'
import { TrendingUp, Wallet, Gauge, ArrowRight, Sparkles, CalendarClock, ExternalLink } from 'lucide-react'
import type { Store, Audit, Fix, Conversion, AuditLog } from '@/types'

function euros(n: number) {
  return `€${Math.round(n).toLocaleString('fr-FR')}`
}

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
        <div className="mb-6 sm:mb-8">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Bienvenue sur Modify</h1>
          <p className="text-text-secondary text-sm">
            Connectez votre boutique : Modify s’occupe du reste.
          </p>
        </div>
        <OnboardingProgress hasStore={false} hasCompletedAudit={false} hasAppliedFix={false} />
        <StoreConnect />
      </div>
    )
  }

  const typedStore = store as Store

  // Latest audit + its fixes
  const { data: latestAudit } = await supabase
    .from('audits').select('*').eq('store_id', typedStore.id)
    .order('created_at', { ascending: false }).limit(1).single()
  const typedAudit = latestAudit as Audit | null

  const { data: fixes } = await supabase
    .from('fixes').select('*').eq('audit_id', typedAudit?.id ?? '')
  const typedFixes = (fixes ?? []) as Fix[]
  const appliedFixes = typedFixes.filter((f) => f.status === 'applied')
  const recovered = appliedFixes.reduce((s, f) => s + f.impact_euros, 0)

  // Conversion (last 60 days) → average after Modify + uplift vs before
  const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const { data: conv } = await supabase
    .from('conversions').select('*').eq('store_id', typedStore.id)
    .gte('date', sixtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: true })
  const conversions = (conv ?? []) as Conversion[]
  const mid = Math.floor(conversions.length / 2)
  const avgBefore = conversions.slice(0, mid).reduce((s, c) => s + c.conversion_rate, 0) / (mid || 1)
  const after = conversions.slice(mid)
  const avgAfter = after.reduce((s, c) => s + c.conversion_rate, 0) / (after.length || 1)
  const uplift = avgBefore > 0 ? ((avgAfter - avgBefore) / avgBefore) * 100 : 0

  // Score /100 + weekly recovered (from score snapshots)
  const { data: snaps } = await supabase
    .from('store_score_snapshots')
    .select('score, recovered_euros, created_at')
    .eq('store_id', typedStore.id)
    .order('created_at', { ascending: false }).limit(14)
  const snapRows = (snaps ?? []) as { score: number; recovered_euros: number; created_at: string }[]
  const score = snapRows[0]?.score ?? (typedAudit ? Math.max(35, 100 - (typedAudit.results?.length ?? 0) * 4) : 60)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const olderSnap = snapRows.find((s) => new Date(s.created_at) <= weekAgo)
  const weekRecovered = olderSnap ? Math.max(0, recovered - Number(olderSnap.recovered_euros)) : recovered

  // Timeline — last meaningful Modify actions (jargon-free)
  const { data: logs } = await supabase
    .from('audit_logs').select('action, created_at, status')
    .eq('store_id', typedStore.id).eq('status', 'success')
    .order('created_at', { ascending: false }).limit(40)
  const timeline = ((logs ?? []) as Pick<AuditLog, 'action' | 'created_at'>[])
    .map((l) => ({ ...timelineEntry(l.action), created_at: l.created_at }))
    .filter((e): e is { icon: string; text: string; created_at: string } => Boolean(e.icon))
    .slice(0, 6)

  const scoreColor = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger'
  const scoreRing = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <OnboardingProgress
        hasStore
        hasCompletedAudit={typedAudit?.status === 'completed'}
        hasAppliedFix={appliedFixes.length > 0}
      />

      {/* Top bar — view the live store */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-text-secondary text-sm truncate">{typedStore.shop_name ?? typedStore.shop_domain}</p>
        <a
          href={`https://${typedStore.shop_domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:border-primary/40 hover:bg-primary/5 text-text-primary text-sm font-medium rounded-xl transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" /> Visualiser ma boutique
        </a>
      </div>

      {/* Hero — money recovered this week */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-6 sm:p-8 mb-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-2">
            <Sparkles className="w-4 h-4" /> Cette semaine
          </div>
          <p className="font-syne font-bold text-3xl sm:text-5xl text-white leading-tight">
            Modify a récupéré {euros(weekRecovered)} <span className="text-white/80">pour votre boutique</span>
          </p>
          <p className="text-white/80 text-sm mt-3 max-w-xl">
            {recovered > 0
              ? `Au total, ${euros(recovered)} de ventes potentielles ont été récupérées grâce aux améliorations appliquées.`
              : 'Lancez votre première analyse pour que Modify commence à récupérer vos ventes perdues.'}
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-16 -top-10 w-32 h-32 rounded-full bg-white/5" />
      </div>

      {/* 3 simple numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <TrendingUp className="w-4 h-4" /> Taux de conversion
          </div>
          <p className="font-syne font-bold text-2xl text-text-primary">
            {avgAfter > 0 ? `${avgAfter.toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs mt-1">
            {uplift > 0
              ? <span className="text-success font-medium">+{uplift.toFixed(0)}% depuis Modify</span>
              : <span className="text-text-muted">Mesuré semaine après semaine</span>}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <Wallet className="w-4 h-4" /> Argent gagné
          </div>
          <p className="font-syne font-bold text-2xl text-success">{euros(recovered)}</p>
          <p className="text-xs mt-1 text-text-muted">grâce aux correctifs appliqués</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <Gauge className="w-4 h-4" /> Score de la boutique
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `conic-gradient(${scoreRing} ${score * 3.6}deg, #27272a 0deg)` }}>
              <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
                <span className={`font-syne font-bold text-sm ${scoreColor}`}>{score}</span>
              </div>
            </div>
            <span className="text-text-muted text-sm">/ 100</span>
          </div>
        </div>
      </div>

      {/* Timeline + next action */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-4 sm:gap-6">
        {/* Recent actions */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6">
          <h2 className="font-syne font-semibold text-text-primary mb-4">Ce que Modify a fait récemment</h2>
          {timeline.length > 0 ? (
            <ul className="space-y-3">
              {timeline.map((e, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{e.icon}</span>
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm">{e.text}</p>
                    <p className="text-text-muted text-xs">
                      {new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <p className="text-text-secondary text-sm mb-4">
                Modify n’a pas encore agi sur votre boutique.
              </p>
              <Link href="/dashboard/audit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors">
                Lancer la première analyse <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Next planned action */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 lg:w-64">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-3">
            <CalendarClock className="w-4 h-4" /> Prochaine action
          </div>
          <p className="text-text-primary font-medium text-sm mb-1">Entretien automatique</p>
          <p className="font-syne font-bold text-lg text-primary capitalize">{nextMaintenanceLabel()}</p>
          <p className="text-text-muted text-xs mt-2 leading-relaxed">
            Modify analysera à nouveau votre boutique et appliquera les améliorations.
          </p>
          <Link href="/dashboard/corrections"
            className="inline-flex items-center gap-1.5 text-primary text-sm font-medium mt-4 hover:text-primary-dark transition-colors">
            Voir mes correctifs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
