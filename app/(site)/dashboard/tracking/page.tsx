import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import ConversionChart from '@/components/dashboard/ConversionChart'
import { TrendingUp, Euro, BarChart3, Target } from 'lucide-react'
import type { Store, Conversion, Fix } from '@/types'

export default async function TrackingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">Connectez une boutique pour voir les données de suivi.</p>
      </div>
    )
  }

  const typedStore = store as Store

  // Last 30 days of conversion data
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: conversions } = await supabase
    .from('conversions')
    .select('*')
    .eq('store_id', typedStore.id)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const typedConversions = (conversions ?? []) as Conversion[]

  // Applied fixes
  const { data: auditData } = await supabase
    .from('audits')
    .select('id')
    .eq('store_id', typedStore.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: appliedFixes } = auditData
    ? await supabase
        .from('fixes')
        .select('*')
        .eq('audit_id', auditData.id)
        .eq('status', 'applied')
    : { data: [] }

  const typedFixes = (appliedFixes ?? []) as Fix[]

  // Compute stats
  const midpoint = Math.floor(typedConversions.length / 2)
  const before = typedConversions.slice(0, midpoint)
  const after = typedConversions.slice(midpoint)

  const avgBefore =
    before.length > 0 ? before.reduce((s, c) => s + c.conversion_rate, 0) / before.length : 0
  const avgAfter =
    after.length > 0 ? after.reduce((s, c) => s + c.conversion_rate, 0) / after.length : 0
  const uplift = avgBefore > 0 ? ((avgAfter - avgBefore) / avgBefore) * 100 : 0

  const totalRevenue = typedConversions.reduce((s, c) => s + c.revenue, 0)
  const recoveredRevenue = typedFixes.reduce((s, f) => s + f.impact_euros, 0)

  const firstFixDate = typedFixes.length > 0
    ? typedFixes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]?.created_at
    : undefined

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Suivi de conversion</h1>
        <p className="text-text-secondary text-sm">
          Mesure de l&apos;uplift de conversion sur 14 jours avant/après application des correctifs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          {
            icon: TrendingUp,
            label: 'Uplift conversion',
            value: uplift > 0 ? `+${uplift.toFixed(1)}%` : `${uplift.toFixed(1)}%`,
            color: uplift >= 0 ? 'text-success' : 'text-danger',
          },
          {
            icon: Euro,
            label: 'Revenus récupérés',
            value: `€${recoveredRevenue.toLocaleString('fr-FR')}`,
            color: 'text-primary',
          },
          {
            icon: BarChart3,
            label: 'Taux moyen (avant)',
            value: `${(avgBefore * 100).toFixed(2)}%`,
            color: 'text-text-primary',
          },
          {
            icon: Target,
            label: 'Taux moyen (après)',
            value: `${(avgAfter * 100).toFixed(2)}%`,
            color: 'text-text-primary',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="w-4 h-4 text-text-muted" />
              <p className="text-text-muted text-xs">{stat.label}</p>
            </div>
            <p className={`font-syne font-bold text-2xl ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne font-semibold text-text-primary">
            Taux de conversion — 30 derniers jours
          </h2>
          {firstFixDate && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <div className="w-8 h-px border-t-2 border-dashed border-primary" />
              Correctifs appliqués
            </div>
          )}
        </div>

        {typedConversions.length > 0 ? (
          <ConversionChart data={typedConversions} fixAppliedDate={firstFixDate} />
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted text-sm">
            Pas encore de données de conversion. Les données apparaîtront après 24h de suivi.
          </div>
        )}
      </div>

      {/* Applied fixes table */}
      {typedFixes.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-syne font-semibold text-text-primary mb-4">
            Correctifs contribuant à l&apos;uplift
          </h2>
          <div className="space-y-2">
            {typedFixes.map((fix) => (
              <div
                key={fix.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-text-primary text-sm font-medium">{fix.title}</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    Appliqué le {new Date(fix.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className="text-success text-sm font-semibold">
                  +€{fix.impact_euros}/mois
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-text-secondary text-sm font-medium">Total récupéré</span>
            <span className="font-syne font-bold text-xl text-primary">
              €{recoveredRevenue.toLocaleString('fr-FR')}/mois
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
