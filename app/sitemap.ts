import type { MetadataRoute } from 'next'
import { LEGAL } from '@/lib/legal'

// Sitemap public de modifea.com — généré automatiquement (exposé sur /sitemap.xml).
// On ne liste que les pages publiques indexables ; le dashboard est protégé (noindex).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = LEGAL.site.replace(/\/$/, '')
  const lastModified = new Date()

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/terms', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/cookies', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/legal', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/support', priority: 0.6, changeFrequency: 'monthly' },
  ]

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
