import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Modify — Optimisation de conversion Shopify',
  description:
    "Connectez votre boutique Shopify. L'IA détecte les fuites de conversion, les corrige automatiquement, et vous montre combien vous gagnez.",
  openGraph: {
    title: 'Modify — Votre boutique perd de l\'argent. Modify le récupère.',
    description: 'IA spécialisée en conversion optimization pour boutiques Shopify.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="bg-background text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
