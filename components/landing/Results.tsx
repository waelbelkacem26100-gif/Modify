import { ScanSearch, Euro, Wand2, Clock } from 'lucide-react'

// Exemple RÉEL (anonymisé) : audit complet d'une boutique d'équipement
// nautique sur l'environnement de production Modify — pas de chiffres inventés.
const stats = [
  { icon: ScanSearch, value: '19', label: 'problèmes détectés', sub: 'sur une vraie boutique analysée', color: 'text-primary' },
  { icon: Euro, value: '875€', label: 'identifiés / mois', sub: 'manque à gagner chiffré point par point', color: 'text-success' },
  { icon: Wand2, value: '8', label: 'corrigés automatiquement', sub: 'sauvegarde + vérification à chaque fois', color: 'text-blue-400' },
  { icon: Clock, value: '~3 min', label: 'pour l’analyse complète', sub: '6 analyses spécialisées en parallèle', color: 'text-violet-400' },
]

// Répartition exacte du même audit (sommes par domaine).
const breakdown = [
  { label: 'Fiches produits (photos, descriptions, titres)', euros: 300 },
  { label: 'Confiance (avis, garanties, contact)', euros: 245 },
  { label: 'Apparence & navigation', euros: 215 },
  { label: 'Vitesse & visibilité Google', euros: 115 },
]
const total = breakdown.reduce((s, b) => s + b.euros, 0)
const max = Math.max(...breakdown.map((b) => b.euros))

export default function Results() {
  return (
    <section className="py-16 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-4">
            Un exemple réel, pas une promesse
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

        {/* Headline stats — vrai audit */}
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

        {/* € breakdown — répartition exacte du même audit */}
        <div className="max-w-2xl mx-auto bg-surface border border-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-syne font-semibold text-text-primary">Manque à gagner par domaine</h3>
            <span className="text-text-muted text-xs">audit réel · boutique nautique</span>
          </div>
          <div className="space-y-3">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-text-secondary text-sm flex-1">{b.label}</span>
                <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden max-w-[40%]">
                  <div className="h-full bg-success/70 rounded-full" style={{ width: `${(b.euros / max) * 100}%` }} />
                </div>
                <span className="font-syne font-bold text-success text-sm w-14 text-right">{b.euros}€</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-5 pt-4 flex items-center justify-between">
            <span className="text-text-primary text-sm font-medium">Total identifié</span>
            <span className="font-syne font-bold text-2xl text-success">{total}€<span className="text-text-muted text-sm font-medium">/mois</span></span>
          </div>
        </div>

        <p className="text-center text-text-muted text-xs mt-6 max-w-xl mx-auto">
          Chiffres issus d&apos;un audit Modify réel (boutique anonymisée). Vos résultats dépendent de votre
          trafic et de votre catalogue — Modify affiche vos chiffres exacts dans votre tableau de bord.
        </p>
      </div>
    </section>
  )
}
