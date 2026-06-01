import { TrendingUp, Clock, MousePointerClick } from 'lucide-react'
import HeroCTA from './HeroCTA'

export default function Hero() {
  return (
    <section className="relative pt-36 pb-28 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          IA spécialisée conversion Shopify
        </div>

        {/* Headline */}
        <h1 className="font-syne text-5xl md:text-6xl lg:text-[80px] font-bold leading-[1.08] tracking-tight mb-7">
          Votre boutique perd
          <br />
          <span className="text-gradient">de l&apos;argent.</span>
          <br />
          <span className="text-text-primary">Modify le récupère.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          Connectez votre boutique Shopify. L&apos;IA détecte les fuites de conversion,
          les corrige automatiquement, et vous montre combien vous gagnez.
        </p>

        {/* CTA */}
        <HeroCTA />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-0 max-w-xl mx-auto">
          {[
            { icon: TrendingUp, value: '+23%', label: 'uplift moyen' },
            { icon: Clock, value: '< 2 min', label: 'pour scanner' },
            { icon: MousePointerClick, value: '1 clic', label: 'pour appliquer' },
          ].map((stat, i) => (
            <div
              key={i}
              className={[
                'flex flex-col items-center py-5',
                i !== 2 ? 'border-r border-border' : '',
              ].join(' ')}
            >
              <stat.icon className="w-4 h-4 text-primary mb-2 opacity-80" />
              <span className="font-syne font-bold text-2xl text-text-primary">{stat.value}</span>
              <span className="text-text-muted text-xs mt-0.5">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard preview mockup */}
      <div className="relative max-w-5xl mx-auto px-6 mt-20">
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
          <div className="p-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Revenus récupérés', value: '€ 2,840', color: 'text-success' },
              { label: 'Problèmes détectés', value: '12', color: 'text-warning' },
              { label: 'Correctifs appliqués', value: '8', color: 'text-primary' },
            ].map((card) => (
              <div key={card.label} className="bg-surface-2 rounded-xl p-4 border border-border">
                <p className="text-text-muted text-xs mb-1">{card.label}</p>
                <p className={`font-syne font-bold text-2xl ${card.color}`}>{card.value}</p>
              </div>
            ))}
            <div className="col-span-3 bg-surface-2 rounded-xl p-4 border border-border h-24 flex items-center justify-center">
              <div className="flex gap-1 items-end h-12">
                {[4, 7, 5, 9, 6, 11, 8, 13, 10, 15, 12, 16].map((h, i) => (
                  <div
                    key={i}
                    className="w-5 rounded-sm bg-primary/60"
                    style={{ height: `${h * 4}px` }}
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
