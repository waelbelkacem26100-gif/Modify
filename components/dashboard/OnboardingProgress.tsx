import Link from 'next/link'
import { Check, Store, ScanSearch, Wand2 } from 'lucide-react'

interface Step {
  number: number
  icon: typeof Store
  title: string
  description: string
  href: string
  cta: string
}

const steps: Step[] = [
  {
    number: 1,
    icon: Store,
    title: 'Connecter ta boutique',
    description: 'Lie ta boutique Shopify via OAuth sécurisé',
    href: '/dashboard/connect',
    cta: 'Connecter',
  },
  {
    number: 2,
    icon: ScanSearch,
    title: 'Lancer le scan',
    description: "L'IA analyse 50+ points de friction en < 2 min",
    href: '/dashboard',
    cta: 'Scanner',
  },
  {
    number: 3,
    icon: Wand2,
    title: 'Appliquer les correctifs',
    description: "Applique les fixes générés et mesure l'uplift",
    href: '/dashboard/corrections',
    cta: 'Voir les correctifs',
  },
]

interface OnboardingProgressProps {
  hasStore: boolean
  hasCompletedAudit: boolean
  hasAppliedFix: boolean
}

export default function OnboardingProgress({
  hasStore,
  hasCompletedAudit,
  hasAppliedFix,
}: OnboardingProgressProps) {
  const completed = [hasStore, hasCompletedAudit, hasAppliedFix]

  // Hide once all 3 steps are done
  if (completed.every(Boolean)) return null

  const currentStep = completed.findIndex((c) => !c)

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-syne font-semibold text-text-primary">Démarrage</h2>
          <p className="text-text-muted text-xs mt-0.5">
            {completed.filter(Boolean).length}/3 étapes complétées
          </p>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-1.5">
          {completed.map((done, i) => (
            <div
              key={i}
              className={[
                'h-1.5 w-8 rounded-full transition-colors duration-300',
                done ? 'bg-primary' : 'bg-border',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {steps.map((step, i) => {
          const done = completed[i]
          const active = i === currentStep
          const locked = i > currentStep

          return (
            <div
              key={step.number}
              className={[
                'relative rounded-xl p-4 border transition-colors duration-150',
                done
                  ? 'bg-success/5 border-success/20'
                  : active
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-surface-2 border-border opacity-50',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                {/* Icon circle */}
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    done
                      ? 'bg-success text-white'
                      : active
                      ? 'bg-primary text-white'
                      : 'bg-border text-text-muted',
                  ].join(' ')}
                >
                  {done ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      'text-sm font-medium',
                      done ? 'text-success' : active ? 'text-text-primary' : 'text-text-muted',
                    ].join(' ')}
                  >
                    {step.title}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* CTA for active step */}
              {active && !locked && (
                <Link
                  href={step.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  {step.cta} →
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
