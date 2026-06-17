import type { Metadata } from 'next'
import { Inter, Syne } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

// v7 — police signature Modify : Syne (géométrique, reconnaissable). Utilisée
// sur les chiffres €/mois, le score /100 et les titres H1 via `font-syne`.
const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://modify-coral.vercel.app'),
  title: 'Modify — Optimisation de conversion Shopify',
  description:
    "Connectez votre boutique Shopify. L'IA détecte les fuites de conversion, les corrige automatiquement, et vous montre combien vous gagnez.",
  openGraph: {
    title: 'Modify — Votre boutique perd de l\'argent. Modify le récupère.',
    description: 'IA spécialisée en conversion optimization pour boutiques Shopify.',
    type: 'website',
  },
}

// v10.1 — applique le thème AVANT le premier paint (zéro flash).
// Priorité : localStorage `modifyTheme` > préférence système. Défaut = système.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('modifyTheme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${syne.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="bg-background text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
