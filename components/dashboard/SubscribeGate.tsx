import { Check } from 'lucide-react'
import SubscribeButton from './SubscribeButton'
import { PLANS } from '@/lib/pricing'

export default function SubscribeGate() {
  const plans = [PLANS.starter, PLANS.pro]
  return (
    <div className="p-6 sm:p-8 flex items-center justify-center min-h-[60vh]">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h2 className="font-syne font-bold text-2xl text-text-primary mb-2">
            Débloquez tout Modify
          </h2>
          <p className="text-text-secondary text-sm">
            Essai gratuit de 14 jours, sans carte bancaire. Annulable à tout moment.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`bg-surface rounded-2xl p-6 border ${p.highlight ? 'border-primary/50' : 'border-border'}`}
            >
              <div className="flex items-baseline gap-1.5 mb-1">
                <h3 className="font-syne font-bold text-lg text-text-primary">{p.name}</h3>
                <span className="text-text-muted text-sm ml-auto font-medium">{p.priceEur}€/mois</span>
              </div>
              <p className="text-text-muted text-xs mb-4">{p.tagline}</p>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <SubscribeButton plan={p.id === 'pro' ? 'pro' : 'starter'} size="md" label={`Choisir ${p.name}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
