import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase-server'
import StoreConnect from '@/components/dashboard/StoreConnect'
import MetricCard from '@/components/dashboard/MetricCard'
import { Euro, AlertTriangle, CheckCircle, TrendingUp, ArrowRight, ScanSearch } from 'lucide-react'
import type { Store, Audit, Fix } from '@/types'

export default async function DashboardPage() {
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
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">
            Bienvenue sur Modify
          </h1>
          <p className="text-text-secondary text-sm">
            Connectez votre première boutique pour démarrer l&apos;analyse.
          </p>
        </div>
        <StoreConnect />
      </div>
    )
  }

  const typedStore = store as Store

  const { data: latestAudit } = await supabase
    .from('audits')
    .select('*')
    .eq('store_id', typedStore.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const typedAudit = latestAudit as Audit | null

  const { data: fixes } = await supabase
    .from('fixes')
    .select('*')
    .eq('audit_id', typedAudit?.id ?? '')

  const typedFixes = (fixes ?? []) as Fix[]

  const appliedFixes = typedFixes.filter((f) => f.status === 'applied')
  const totalRecovered = appliedFixes.reduce((sum, f) => sum + f.impact_euros, 0)
  const issueCount = typedAudit?.results?.length ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">
            {typedStore.shop_name ?? typedStore.shop_domain}
          </h1>
          <p className="text-text-secondary text-sm">{typedStore.shop_domain}</p>
        </div>
        <Link
          href="/dashboard/audit"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors"
        >
          <ScanSearch className="w-4 h-4" />
          Lancer un scan
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Euro}
          label="Revenus récupérés"
          value={`€${totalRecovered.toLocaleString('fr-FR')}`}
          sub="via correctifs appliqués"
          color="success"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Problèmes détectés"
          value={String(issueCount)}
          sub={typedAudit ? 'dernier audit' : 'aucun audit'}
          color="warning"
        />
        <MetricCard
          icon={CheckCircle}
          label="Correctifs appliqués"
          value={String(appliedFixes.length)}
          sub={`sur ${typedFixes.length} générés`}
          color="primary"
        />
        <MetricCard
          icon={TrendingUp}
          label="Impact potentiel"
          value={`€${(typedAudit?.total_impact_euros ?? 0).toLocaleString('fr-FR')}`}
          sub="par mois si tout appliqué"
          color="default"
        />
      </div>

      {/* Recent audit */}
      {typedAudit ? (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-syne font-semibold text-text-primary">Dernier audit</h2>
            <Link
              href="/dashboard/audit"
              className="text-primary text-sm hover:text-primary-dark transition-colors flex items-center gap-1"
            >
              Voir les détails
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {typedAudit.results?.slice(0, 3).map((issue) => (
            <div
              key={issue.id}
              className="flex items-start justify-between py-3 border-b border-border last:border-0"
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-text-primary text-sm font-medium truncate">{issue.title}</p>
                <p className="text-text-muted text-xs mt-0.5">{issue.category}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-warning text-sm font-semibold">
                  €{issue.impact_euros}/mois
                </span>
                <span
                  className={[
                    'text-xs px-2 py-0.5 rounded-full',
                    issue.priority === 'high'
                      ? 'bg-danger/10 text-danger'
                      : issue.priority === 'medium'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success',
                  ].join(' ')}
                >
                  {issue.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <ScanSearch className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucun audit encore</h3>
          <p className="text-text-secondary text-sm mb-5">
            Lancez votre premier scan pour découvrir combien votre boutique perd chaque mois.
          </p>
          <Link
            href="/dashboard/audit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors"
          >
            Démarrer l&apos;audit IA
          </Link>
        </div>
      )}
    </div>
  )
}
