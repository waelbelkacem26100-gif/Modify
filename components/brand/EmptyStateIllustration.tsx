// v9 — illustration d'état vide : une vitrine « endormie » + une étoile qui
// clignote. SVG inline, couleurs Modify (violet) / Mody (vert). aria-hidden.
export default function EmptyStateIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="es-roof" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#8B7BFF" />
          <stop offset="1" stopColor="#6D5FE8" />
        </linearGradient>
      </defs>

      {/* lueur ambiante */}
      <ellipse cx="120" cy="150" rx="90" ry="14" fill="rgba(139,123,255,0.10)" />

      {/* corps de la boutique */}
      <rect x="56" y="74" width="128" height="74" rx="10" fill="#0F1424" stroke="#1C2440" strokeWidth="2" />
      {/* auvent */}
      <path d="M48 74 L62 50 H178 L192 74 Z" fill="url(#es-roof)" />
      {/* rayures de l'auvent */}
      {[70, 92, 114, 136, 158].map((x) => (
        <path key={x} d={`M${x} 74 L${x + 10} 50 h11 L${x + 1} 74 Z`} fill="rgba(255,255,255,0.10)" />
      ))}
      {/* porte */}
      <rect x="104" y="104" width="32" height="44" rx="4" fill="#1A2035" stroke="#1C2440" strokeWidth="1.5" />
      {/* vitrines */}
      <rect x="66" y="92" width="28" height="22" rx="3" fill="#1A2035" />
      <rect x="146" y="92" width="28" height="22" rx="3" fill="#1A2035" />

      {/* « Zzz » du sommeil */}
      <text x="150" y="44" fill="#8892A4" fontSize="13" fontFamily="sans-serif" fontWeight="700">z</text>
      <text x="162" y="34" fill="#8892A4" fontSize="16" fontFamily="sans-serif" fontWeight="700">z</text>
      <text x="178" y="22" fill="#8892A4" fontSize="20" fontFamily="sans-serif" fontWeight="700">Z</text>

      {/* étoile qui clignote (vert Mody) */}
      <g className="animate-pulse">
        <path d="M52 30 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" fill="#34D399" />
      </g>
    </svg>
  )
}
