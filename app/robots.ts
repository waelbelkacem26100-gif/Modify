import type { MetadataRoute } from 'next'
import { LEGAL } from '@/lib/legal'

// robots.txt de modifea.com — généré automatiquement (exposé sur /robots.txt).
// Indexe les pages publiques, bloque l'espace privé (dashboard) et les routes API,
// et référence le sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = LEGAL.site.replace(/\/$/, '')
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
