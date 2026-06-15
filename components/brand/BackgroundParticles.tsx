// v9 — particules violettes subtiles en arrière-plan (vie sans distraction).
// SVG + CSS pur (pas de canvas/WebGL). Positions fixes (déterministes), dérive
// lente. Coupées par prefers-reduced-motion (globals.css) et aria-hidden.

// 26 points déterministes (x%, y%, r px, delay s, durée s).
const PARTICLES = Array.from({ length: 26 }, (_, i) => {
  // Pseudo-aléatoire déterministe basé sur l'index (stable entre rendus/SSR).
  const a = Math.sin(i * 12.9898) * 43758.5453
  const b = Math.sin(i * 78.233) * 12345.6789
  const x = Math.abs(a % 1) * 100
  const y = Math.abs(b % 1) * 100
  const r = 1 + Math.abs((a * 1.7) % 1) * 2
  const delay = (Math.abs(b % 1) * 6).toFixed(2)
  const dur = (8 + Math.abs(a % 1) * 5).toFixed(2)
  return { x, y, r, delay, dur }
})

export default function BackgroundParticles() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {PARTICLES.map((p, i) => (
          <circle
            key={i}
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={p.r}
            fill="rgba(139,123,255,0.30)"
            className="animate-float-slow"
            style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
          />
        ))}
      </svg>
    </div>
  )
}
