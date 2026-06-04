import { TrendingUp, Clock, MousePointerClick } from 'lucide-react'
import HeroCTA from './HeroCTA'

export default function Hero() {
  return (
    <section className="relative pt-24 sm:pt-36 pb-16 sm:pb-28 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm text-primary font-medium mb-8 sm:mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
          IA spécialisée conversion Shopify
        </div>

        {/* Headline */}
        <h1 className="font-syne text-4xl sm:text-5xl md:text-6xl lg:text-[80px] font-bold leading-[1.1] sm:leading-[1.08] tracking-tight mb-5 sm:mb-7">
          Votre boutique perd
          <br />
          <span className="text-gradient">de l&apos;argent.</span>
          <br />
          <span className="text-text-primary">Modify le récupère.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          Connectez votre boutique Shopify une fois. L&apos;IA audite, corrige et améliore votre site
          chaque semaine — automatiquement — et vous montre combien vous récupérez, en euros.
        </p>

        {/* CTA */}
        <HeroCTA />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-0 max-w-sm sm:max-w-xl mx-auto">
          {[
            { icon: TrendingUp, value: '+23%', label: 'uplift moyen' },
            { icon: Clock, value: '< 2 min', label: 'pour scanner' },
            { icon: MousePointerClick, value: '1 clic', label: 'pour appliquer' },
          ].map((stat, i) => (
            <div
              key={i}
              className={[
                'flex flex-col items-center py-4 sm:py-5',
                i !== 2 ? 'border-r border-border' : '',
              ].join(' ')}
            >
              <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mb-1.5 sm:mb-2 opacity-80" />
              <span className="font-syne font-bold text-lg sm:text-2xl text-text-primary">{stat.value}</span>
              <span className="text-text-muted text-[10px] sm:text-xs mt-0.5">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard preview mockup — hidden on xs, visible from sm */}
      <div className="hidden sm:block relative max-w-5xl mx-auto px-4 sm:px-6 mt-16 sm:mt-20">
        <div className="relative rounded-2xl border border-white/8 overflow-hidden bg-surface shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none z-10" />
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-surface-2 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
            </div>
            <div className="flex-1 mx-4 h-6 bg-surface rounded-md flex items-center px-3">
              <span className="text-text-muted text-xs">modify.io/dashboard</span>
            </div>
          </div>
          {/* Fake dashboard content */}
          <div className="p-4 sm:p-6 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Revenus récupérés', value: '€ 2,840', color: 'text-success' },
              { label: 'Problèmes détectés', value: '12', color: 'text-warning' },
              { label: 'Correctifs appliqués', value: '8', color: 'text-primary' },
            ].map((card) => (
              <div key={card.label} className="bg-surface-2 rounded-xl p-3 sm:p-4 border border-border">
                <p className="text-text-muted text-[10px] sm:text-xs mb-1">{card.label}</p>
                <p className={`font-syne font-bold text-lg sm:text-2xl ${card.color}`}>{card.value}</p>
              </div>
            ))}
            <div className="col-span-3 bg-surface-2 rounded-xl p-4 border border-border h-20 sm:h-24 flex items-center justify-center">
              <div className="flex gap-1 items-end h-10 sm:h-12">
                {[4, 7, 5, 9, 6, 11, 8, 13, 10, 15, 12, 16].map((h, i) => (
                  <div
                    key={i}
                    className="w-4 sm:w-5 rounded-sm bg-primary/60"
                    style={{ height: `${h * 3}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
