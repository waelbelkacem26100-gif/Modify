import Link from 'next/link'
import { Check, Zap } from 'lucide-react'

const features = [
  "Connexion Shopify OAuth sécurisée",
  "Scan IA complet (50+ points d'analyse)",
  "Impact estimé en €/mois pour chaque problème",
  "Génération automatique de correctifs Liquid",
  "Preview before/after de chaque correctif",
  "Déploiement sur thème dupliqué",
  "Rollback instantané",
  "Suivi de conversion sur 14 jours",
  "Rapport d'uplift en euros",
  "Boutiques illimitées",
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-16 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-4">
            Tarifs
          </p>
          <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 sm:mb-5">
            Simple, transparent, ROI positif
          </h2>
          <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto">
            Un seul plan, accès à tout. Si Modify ne vous rapporte pas 10× son coût en 14 jours,
            vous ne payez rien.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="relative bg-surface border-2 border-primary/40 rounded-2xl p-6 sm:p-8 glow-primary">
            {/* Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1 bg-primary rounded-full text-xs font-semibold text-white whitespace-nowrap">
              <Zap className="w-3 h-3 fill-white flex-shrink-0" />
              14 jours gratuits
            </div>

            <div className="mb-6 sm:mb-8">
              <div className="flex items-end gap-2 mb-2">
                <span className="font-syne font-bold text-5xl text-text-primary">49€</span>
                <span className="text-text-muted mb-1.5">/mois</span>
              </div>
              <p className="text-text-secondary text-sm">
                Puis 49€/mois · Annulable à tout moment
              </p>
            </div>

            <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-text-secondary text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/sign-up"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 text-sm sm:text-[15px] hover:shadow-lg hover:shadow-primary/20"
            >
              Commencer 14 jours gratuits
            </Link>

            <p className="text-center text-text-muted text-xs mt-4">
              Sans carte bancaire · Accès immédiat
            </p>
          </div>
        </div>

        {/* Trust signals */}
        <div className="mt-8 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
          {[
            { title: 'ROI garanti', desc: 'Si vous ne récupérez pas 10× le coût en 14 jours, remboursé.' },
            { title: 'Sécurité maximale', desc: 'OAuth Shopify, données chiffrées, accès révocable à tout moment.' },
            { title: 'Support dédié', desc: 'Équipe disponible 7j/7 pour vous aider à maximiser vos gains.' },
          ].map((item) => (
            <div key={item.title} className="bg-surface border border-border rounded-xl p-5 sm:p-6">
              <h4 className="font-syne font-semibold text-text-primary mb-2">{item.title}</h4>
              <p className="text-text-muted text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
