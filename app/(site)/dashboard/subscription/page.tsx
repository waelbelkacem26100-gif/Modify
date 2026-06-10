import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserSubscription } from '@/lib/subscription'
import ManageSubscriptionButton from '@/components/dashboard/ManageSubscriptionButton'
import SubscribeGate from '@/components/dashboard/SubscribeGate'
import { Calendar, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { planById } from '@/lib/pricing'
import type { Subscription } from '@/lib/subscription'

const statusConfig: Record<
  Subscription['status'],
  { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }
> = {
  active: {
    label: 'Actif',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
    icon: CheckCircle,
  },
  trialing: {
    label: 'Essai gratuit',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    icon: Clock,
  },
  past_due: {
    label: 'Paiement en retard',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    icon: AlertTriangle,
  },
  canceled: {
    label: 'Annulé',
    color: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/20',
    icon: XCircle,
  },
  incomplete: {
    label: 'Incomplet',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    icon: AlertTriangle,
  },
  incomplete_expired: {
    label: 'Expiré',
    color: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/20',
    icon: XCircle,
  },
  unpaid: {
    label: 'Impayé',
    color: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/20',
    icon: XCircle,
  },
}

export default async function SubscriptionPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const subscription = await getUserSubscription(userId)

  if (!subscription) {
    return (
      <div className="p-4 sm:p-8">
        <div className="mb-2 max-w-2xl mx-auto">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Mon abonnement</h1>
          <p className="text-text-secondary text-sm">Choisissez le plan qui vous convient.</p>
        </div>
        <SubscribeGate />
      </div>
    )
  }

  const config = statusConfig[subscription.status] ?? statusConfig.canceled
  const StatusIcon = config.icon
  const currentPlan = planById(subscription.plan)

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const isActive = ['active', 'trialing'].includes(subscription.status)

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Mon abonnement</h1>
        <p className="text-text-secondary text-sm">Gérez votre abonnement Modify.</p>
      </div>

      {/* Status card */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-3">
              Statut de l&apos;abonnement
            </p>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.border}`}>
              <StatusIcon className={`w-4 h-4 ${config.color}`} />
              <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-1">Plan</p>
            <p className="font-syne font-bold text-text-primary">{currentPlan.name} · {currentPlan.priceEur}€ / mois</p>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        {trialEnd && subscription.status === 'trialing' && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-text-muted text-xs">Fin de l&apos;essai</p>
            </div>
            <p className="font-medium text-text-primary text-sm">{trialEnd}</p>
          </div>
        )}

        {periodEnd && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-text-muted" />
              <p className="text-text-muted text-xs">Prochain renouvellement</p>
            </div>
            <p className="font-medium text-text-primary text-sm">{periodEnd}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h2 className="font-syne font-semibold text-text-primary mb-1">Gérer l&apos;abonnement</h2>
        <p className="text-text-secondary text-sm mb-5">
          Modifiez votre moyen de paiement, téléchargez vos factures ou annulez votre abonnement
          depuis le portail Stripe.
        </p>

        {isActive ? (
          <ManageSubscriptionButton />
        ) : (
          <p className="text-text-secondary text-sm">
            Votre abonnement est inactif. Choisissez un plan ci-dessous pour retrouver l’accès.
          </p>
        )}
      </div>

      {!isActive && (
        <div className="mt-4">
          <SubscribeGate />
        </div>
      )}
    </div>
  )
}
