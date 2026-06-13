/**
 * <ModyAvatar /> — l'identité graphique de Mody (v6).
 *
 * Construit à partir de l'éclair ⚡ du logo Modify (le même symbole, recoloré
 * dans le violet Mody), enfermé dans un « squircle » arrondi avec un dégradé et
 * une étincelle compagnon. Objectif : reconnaissable d'un coup d'œil, distinct
 * d'une icône de bibliothèque (lucide bot/sparkles). Réutilisé partout où Mody
 * parle : bouton flottant, bandeau d'activité, en-tête du panneau de chat.
 *
 * Tout est en SVG vectoriel — `size` libre, contour net à toute échelle.
 */

interface ModyAvatarProps {
  /** Côté du carré en px (défaut 40). */
  size?: number
  /** Anneau lumineux autour (état « actif » / survol). */
  glow?: boolean
  className?: string
  /** Désactive l'étincelle (versions très petites < 20px où elle deviendrait du bruit). */
  spark?: boolean
}

export default function ModyAvatar({ size = 40, glow = false, className, spark = true }: ModyAvatarProps) {
  // id unique par instance — sinon plusieurs avatars sur la page partagent le
  // même <linearGradient> et le rendu casse au démontage du premier.
  const gid = `mody-grad-${size}`
  const showSpark = spark && size >= 20

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mody"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 8px rgba(139,123,255,0.55))' } : undefined}
    >
      <defs>
        <linearGradient id={gid} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A99BFF" />
          <stop offset="0.55" stopColor="#8B7BFF" />
          <stop offset="1" stopColor="#6D5CE6" />
        </linearGradient>
      </defs>

      {/* Squircle de fond — coins très arrondis, signature « app » et non « bouton OS » */}
      <path
        d="M24 3C12.5 3 7 8.5 5 16c-1.6 6-1.6 10 0 16 2 7.5 7.5 13 19 13s17-5.5 19-13c1.6-6 1.6-10 0-16C40.9 8.5 35.5 3 24 3Z"
        fill={`url(#${gid})`}
      />

      {/* Éclair ⚡ — repris du logo Modify, en blanc plein sur le violet */}
      <path
        d="M26.5 12 16 26.4h6.6L21 38l11-15.2h-6.8L26.5 12Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Étincelle compagnon — le détail « vivant » qui le distingue d'un simple bolt */}
      {showSpark && (
        <g>
          <path
            d="M37 9.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5Z"
            fill="#FFFFFF"
            opacity="0.95"
          />
        </g>
      )}
    </svg>
  )
}
