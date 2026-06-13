import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system v2 — dark premium (Linear/Vercel/Stripe niveau).
        background: '#0A0A0B',
        surface: '#141416',
        'surface-2': '#1C1C1F',
        border: '#26262A',
        primary: '#FF6B35',
        'primary-dark': '#E55622',
        'primary-glow': 'rgba(255, 107, 53, 0.15)',
        // Mody — 2e couleur de marque (v6). Tout ce qui est violet = Mody parle :
        // bouton flottant, bandeau, panneau de chat, avatar. Signature visuelle.
        mody: '#8B7BFF',
        'mody-dark': '#6D5CE6',
        'mody-bright': '#A99BFF',
        'mody-glow': 'rgba(139, 123, 255, 0.16)',
        'text-primary': '#FAFAFA',
        'text-secondary': '#A1A1AA',
        'text-muted': '#71717A',
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
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
