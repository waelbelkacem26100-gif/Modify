import Link from 'next/link'
import { Check } from 'lucide-react'
import { PLANS, type PlanId } from '@/lib/pricing'

const ORDER: PlanId[] = ['free', 'starter', 'pro']

export default function Pricing() {
  return (
    <section id="pricing" className="py-16 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-4">Tarifs</p>
          <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 sm:mb-5">
            Commencez gratuitement
          </h2>
          <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto">
            Testez sans payer. Passez à la vitesse supérieure quand Modify vous rapporte.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
          {ORDER.map((id) => {
            const p = PLANS[id]
            const featured = p.highlight
            return (
              <div
                key={id}
                className={[
                  'relative bg-surface rounded-2xl p-6 sm:p-7 border',
                  featured ? 'border-primary/50 md:-mt-3 md:mb-3 glow-primary' : 'border-border',
                ].join(' ')}
              >
                {featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 bg-primary rounded-full text-xs font-semibold text-white whitespace-nowrap">
                    Le plus populaire
                  </div>
                )}

                <h3 className="font-syne font-bold text-lg text-text-primary mb-1">{p.name}</h3>
                <p className="text-text-muted text-xs mb-4 min-h-8">{p.tagline}</p>

                <div className="flex items-end gap-1.5 mb-5">
                  <span className="font-syne font-bold text-4xl text-text-primary">{p.priceEur}€</span>
                  {p.priceEur > 0 && <span className="text-text-muted mb-1 text-sm">/mois</span>}
                </div>

                <ul className="space-y-2.5 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-primary" />
                      </div>
                      <span className="text-text-secondary text-sm">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={id === 'free' ? '/sign-up' : `/sign-up?plan=${id}`}
                  className={[
                    'w-full inline-flex items-center justify-center px-5 py-3 font-semibold rounded-xl transition-all text-sm',
                    featured
                      ? 'bg-primary hover:bg-primary-dark text-white hover:shadow-lg hover:shadow-primary/20'
                      : 'bg-surface-2 hover:bg-border text-text-primary border border-border',
                  ].join(' ')}
                >
                  {p.cta}
                </Link>
              </div>
            )
          })}
        </div>

        <p className="text-center text-text-muted text-xs mt-8">
          14 jours d’essai gratuit sur Starter et Pro · Sans engagement · Annulable à tout moment
        </p>
      </div>
    </section>
  )
}
