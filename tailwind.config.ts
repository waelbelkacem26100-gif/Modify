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
        // Design system v7 — dark premium, fonds légèrement violet-teintés.
        background: '#0D0D0F',
        surface: '#141419',
        'surface-2': '#1E1E26',
        border: '#2A2A38',
        // INVERSION v7 : le VIOLET est désormais la couleur Modify (toute
        // l'interface : logo, sidebar active, CTA, accents).
        primary: '#8B7BFF',
        'primary-dark': '#6D5FE8',
        'primary-bright': '#A99BFF',
        'primary-glow': 'rgba(139, 123, 255, 0.16)',
        // Mody — désormais ORANGE, et UNIQUEMENT pour Mody (bouton flottant,
        // bandeau, panneau, avatar). Seule chose orange de l'interface.
        mody: '#FF6B35',
        'mody-dark': '#E55622',
        'mody-bright': '#FF8A5E',
        'mody-glow': 'rgba(255, 107, 53, 0.16)',
        'text-primary': '#F0F0F0',
        'text-secondary': '#8888A0',
        'text-muted': '#6B6B80',
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
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        proofReveal: {
          '0%': { opacity: '0', transform: 'translateY(-10px) scale(0.97)', maxHeight: '0' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', maxHeight: '1200px' },
        },
      },
    },
  },
  plugins: [],
}

export default config
