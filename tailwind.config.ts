import type { Config } from 'tailwindcss'

const config: Config = {
  // v10.1 — bascule dark/light pilotée par la classe `.dark` sur <html>.
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // v10.1 — tokens « surface/texte/bordure » pilotés par variables CSS
        // (canaux RGB) pour basculer dark ⇆ light SANS toucher les composants.
        // Le format `rgb(var(--x) / <alpha-value>)` préserve les modificateurs
        // d'opacité Tailwind (ex: bg-surface/40, border-border/40).
        background: 'rgb(var(--bg-base) / <alpha-value>)',
        surface: 'rgb(var(--bg-card) / <alpha-value>)',
        'surface-2': 'rgb(var(--bg-surface-2) / <alpha-value>)',
        border: 'rgb(var(--border-color) / <alpha-value>)',
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        // VIOLET = Modify (toute l'interface : logo, sidebar active, CTA, accents).
        // Invariants dans les deux modes (design system v9 conservé).
        primary: '#8B7BFF',
        'primary-dark': '#6D5FE8',
        'primary-bright': '#A99BFF',
        'primary-glow': 'rgba(139, 123, 255, 0.16)',
        // Mody — VERT émeraude (v9), et UNIQUEMENT pour Mody (bouton flottant,
        // bandeau, panneau, avatar). Seule chose verte-Mody de l'interface.
        mody: '#10B981',
        'mody-dark': '#059669',
        'mody-bright': '#34D399',
        'mody-glow': 'rgba(16, 185, 129, 0.16)',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        // v6 — police d'accroche : Space Grotesk (géométrique, du caractère) sur
        // tous les titres/gros chiffres via l'alias `font-syne` déjà en place.
        // Inter (`font-sans`) reste sur le corps de texte.
        syne: ['var(--font-display)', 'var(--font-inter)', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-inter)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        // v6 — révélation marquante d'une preuve au passage « Corrigé »
        'proof-reveal': 'proofReveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        // v7 — animation signature « ticket de prix barré » : la barre rouge se
        // trace de gauche à droite (400ms), puis le montant vert apparaît.
        strike: 'strike 0.4s ease-out forwards',
        'price-reveal': 'priceReveal 0.65s ease-out forwards',
        // v9 — vie : entrée des cartes en stagger, lueur pulsée Mody, dérive des particules
        'card-enter': 'cardEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'float-slow': 'floatSlow 10s ease-in-out infinite',
        'score-draw': 'scoreDraw 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cardEnter: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(16,185,129,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(16,185,129,0.6)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '50%': { transform: 'translateY(-12px)', opacity: '1' },
        },
        scoreDraw: {
          '0%': { strokeDashoffset: 'var(--score-circumference)' },
          '100%': { strokeDashoffset: 'var(--score-offset)' },
        },
        proofReveal: {
          '0%': { opacity: '0', transform: 'translateY(-10px) scale(0.97)', maxHeight: '0' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', maxHeight: '1200px' },
        },
        strike: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        priceReveal: {
          '0%, 65%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
