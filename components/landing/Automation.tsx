import { FileText, Gauge, Tag, BarChart3, Check, Sparkles } from 'lucide-react'

const categories = [
  {
    icon: FileText,
    title: 'Contenu & SEO',
    color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20',
    items: [
      'Descriptions produits réécrites',
      'Meta titles & descriptions optimisés',
      'Alt text sur toutes les images',
      'Données structurées JSON-LD',
      '1 article de blog SEO par semaine',
    ],
  },
  {
    icon: Gauge,
    title: 'Vitesse',
    color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
    items: [
      'Images > 500 Ko compressées (−90%)',
      'Re-upload automatique sur Shopify',
      'Score PageSpeed mesuré chaque semaine',
      'Évolution suivie dans le temps',
    ],
  },
  {
    icon: Tag,
    title: 'Conversion',
    color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20',
    items: [
      'Promos auto sur les invendus (réversibles)',
      'Prix barrés compare-at appliqués',
      'Score de conversion par produit /10',
      'Packs cross-sell suggérés',
    ],
  },
  {
    icon: BarChart3,
    title: 'Suivi',
    color: 'text-success', bg: 'bg-success/10', border: 'border-success/20',
    items: [
      'Email récap chaque semaine',
      'Score global évolutif en €',
      'Alertes nouveau problème détecté',
      'Tout chiffré en €/mois',
    ],
  },
]

export default function Automation() {
  return (
    <section id="features" className="py-16 sm:py-28 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-4">
            En pilote automatique
          </p>
          <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 sm:mb-5">
            Ce que Modify fait
            <span className="hidden sm:inline"><br /></span>
            <span className="sm:hidden"> </span>
            <span className="text-gradient">à votre place</span>
          </h2>
          <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto">
            Connectez votre boutique une fois. Modify l&apos;audite, la corrige et l&apos;améliore
            chaque semaine — sans que vous touchiez à quoi que ce soit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {categories.map((cat) => (
            <div key={cat.title} className="bg-surface border border-border rounded-2xl p-5 sm:p-6 hover:border-zinc-600 transition-colors">
              <div className={`w-10 h-10 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center mb-4`}>
                <cat.icon className={`w-5 h-5 ${cat.color}`} />
              </div>
              <h3 className="font-syne font-bold text-base sm:text-lg text-text-primary mb-4">{cat.title}</h3>
              <ul className="space-y-2.5">
                {cat.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-text-secondary text-sm leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Guided accompaniment note */}
        <div className="mt-6 sm:mt-8 bg-surface border border-border rounded-2xl p-5 sm:p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-syne font-semibold text-text-primary mb-1">Et pour le reste, Modify vous guide</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Photos produits, design, stratégie marketing, nouveaux produits : ce que Modify ne peut pas
              appliquer seul, il l&apos;analyse, le chiffre en €/mois et vous accompagne pas à pas.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
