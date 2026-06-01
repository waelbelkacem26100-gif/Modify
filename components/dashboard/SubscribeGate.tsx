import { Lock, Check } from 'lucide-react'
import SubscribeButton from './SubscribeButton'

const features = [
  'Scan IA complet (50+ points)',
  'Impact chiffré en €/mois',
  'Génération de correctifs Liquid',
  'Before/after visuel + rollback',
  'Suivi de conversion sur 14 jours',
]

export default function SubscribeGate() {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-7 h-7 text-primary" />
        </div>

        <h2 className="font-syne font-bold text-2xl text-text-primary mb-2">
          Abonnement requis
        </h2>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          L&apos;accès aux audits IA est réservé aux abonnés Modify.
          Commencez votre essai gratuit de 14 jours, sans carte bancaire.
        </p>

        <ul className="text-left space-y-2.5 mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-text-secondary">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-primary" />
              </div>
              {f}
            </li>
          ))}
        </ul>

        <SubscribeButton />

        <p className="text-text-muted text-xs mt-4">
          49€/mois après l&apos;essai · Annulable à tout moment
        </p>
      </div>
    </div>
  )
}
