import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
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
    <html lang="fr" className={inter.variable}>
      <body className="bg-background text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
