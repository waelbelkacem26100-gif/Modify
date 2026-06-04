import { Euro, ImageDown, FileText, Clock } from 'lucide-react'

const stats = [
  { icon: Euro, value: '€2,840', label: 'récupérés / mois', sub: 'en moyenne sur les correctifs appliqués', color: 'text-success' },
  { icon: ImageDown, value: '−90%', label: 'poids des images', sub: 'compression automatique vérifiée', color: 'text-primary' },
  { icon: FileText, value: '4 / mois', label: 'articles SEO publiés', sub: 'contenu organique en pilote auto', color: 'text-blue-400' },
  { icon: Clock, value: '12 h', label: 'économisées / mois', sub: 'tout ce que vous ne faites plus', color: 'text-violet-400' },
]

const breakdown = [
  { label: 'Descriptions & SEO produits', euros: '€780' },
  { label: 'Vitesse & images', euros: '€640' },
  { label: 'Trust & social proof', euros: '€620' },
  { label: 'Promos sur invendus', euros: '€800' },
]

export default function Results() {
  return (
    <section className="py-16 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-4">
            Des résultats, pas des scores
          </p>
          <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 sm:mb-5">
            Vous voyez toujours
            <span className="hidden sm:inline"><br /></span>
            <span className="sm:hidden"> </span>
            <span className="text-gradient">votre argent</span>
          </h2>
          <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto">
            Chaque problème détecté est chiffré en €/mois perdus. Chaque correction affiche les € récupérés.
            Jamais de score abstrait — juste votre chiffre d&apos;affaires.
          </p>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8 sm:mb-12">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-2xl p-5 sm:p-6 text-center">
              <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-3 opacity-80`} />
              <p className={`font-syne font-bold text-3xl sm:text-4xl ${s.color}`}>{s.value}</p>
              <p className="text-text-primary text-sm font-medium mt-1">{s.label}</p>
              <p className="text-text-muted text-xs mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* € breakdown card */}
        <div className="max-w-2xl mx-auto bg-surface border border-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-syne font-semibold text-text-primary">Revenu récupéré par levier</h3>
            <span className="text-text-muted text-xs">estimation mensuelle</span>
          </div>
          <div className="space-y-3">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-text-secondary text-sm flex-1">{b.label}</span>
                <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden max-w-[40%]">
                  <div className="h-full bg-success/70 rounded-full" style={{ width: `${(parseInt(b.euros.replace(/\D/g, '')) / 800) * 100}%` }} />
                </div>
                <span className="font-syne font-bold text-success text-sm w-14 text-right">{b.euros}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-5 pt-4 flex items-center justify-between">
            <span className="text-text-primary text-sm font-medium">Total récupérable</span>
            <span className="font-syne font-bold text-2xl text-success">€2,840<span className="text-text-muted text-sm font-medium">/mois</span></span>
          </div>
        </div>

        <p className="text-center text-text-muted text-xs mt-6 max-w-xl mx-auto">
          Estimations basées sur les leviers de conversion détectés. Vos résultats réels dépendent de votre
          trafic et de votre catalogue — Modify affiche vos chiffres exacts dans le dashboard.
        </p>
      </div>
    </section>
  )
}
