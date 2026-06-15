import { Link2, ScanSearch, Wand2, BarChart3 } from 'lucide-react'

const steps = [
  {
    icon: Link2,
    number: '01',
    title: 'Connecter',
    description:
      'Liez votre boutique Shopify en 30 secondes via OAuth sécurisé. Zéro code requis, accès révocable à tout moment.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  {
    icon: ScanSearch,
    number: '02',
    title: 'Scanner',
    description:
      "L'IA analyse 68 points de friction en moins de 3 minutes : thème, fiches produits, trust signals, vitesse, checkout.",
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    icon: Wand2,
    number: '03',
    title: 'Corriger',
    description:
      "Appliquez les correctifs automatiques en un clic. Preview before/after, déploiement sur thème dupliqué, rollback instantané.",
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
  },
  {
    icon: BarChart3,
    number: '04',
    title: 'Mesurer',
    description:
      "Suivez l'uplift de conversion en temps réel sur 14 jours. Voyez exactement combien d'euros vos correctifs ont récupéré.",
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-4">
            Comment ça marche
          </p>
          <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 sm:mb-5">
            De la détection au gain,
            <span className="hidden sm:inline"><br /></span>
            <span className="sm:hidden"> </span>
            en 4 étapes
          </h2>
          <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto">
            Modify automatise tout le processus. Vous n&apos;avez qu&apos;à valider et encaisser.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%_-_10px)] w-5 h-px bg-border z-10" />
              )}

              <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 h-full hover:border-zinc-600 transition-all duration-200 group-hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4 sm:mb-5">
                  <div className={`w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center`}>
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <span className="font-syne font-bold text-3xl text-border">{step.number}</span>
                </div>
                <h3 className="font-syne font-bold text-base sm:text-lg text-text-primary mb-2">
                  {step.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
