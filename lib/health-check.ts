import { getThemes, getProducts } from '@/lib/shopify'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export type CheckStatus = 'ok' | 'warn' | 'fail'
export interface HealthCheck {
  name: string
  status: CheckStatus
  detail: string
}
export interface HealthReport {
  shop: string
  checks: HealthCheck[]
  okCount: number
  warnCount: number
  failCount: number
}

const REQUIRED_SCOPES = ['read_products', 'write_products', 'read_content', 'write_content', 'read_themes']
const REQUIRED_TABLES = [
  'audit_logs', 'image_optimizations', 'pagespeed_scores',
  'blog_articles', 'store_score_snapshots', 'product_promos', 'guides',
]

export async function runHealthChecks(store: Store, supabase: SupabaseClient): Promise<HealthReport> {
  const checks: HealthCheck[] = []

  // 1. Shopify token + granted scopes
  try {
    const res = await fetch(
      `https://${store.shop_domain}/admin/oauth/access_scopes.json`,
      { headers: { 'X-Shopify-Access-Token': store.access_token } }
    )
    if (!res.ok) {
      checks.push({ name: 'Token Shopify', status: 'fail', detail: `OAuth invalide (HTTP ${res.status}) — reconnectez la boutique` })
    } else {
      const data = (await res.json()) as { access_scopes?: { handle: string }[] }
      const granted = new Set((data.access_scopes ?? []).map((s) => s.handle))
      checks.push({ name: 'Token Shopify', status: 'ok', detail: 'OAuth valide' })
      const missing = REQUIRED_SCOPES.filter((s) => !granted.has(s))
      checks.push({
        name: 'Scopes Shopify',
        status: missing.length ? 'warn' : 'ok',
        detail: missing.length ? `Manquants : ${missing.join(', ')} — reconnectez` : 'Tous les scopes requis accordés',
      })
    }
  } catch (e) {
    checks.push({ name: 'Token Shopify', status: 'fail', detail: `Erreur réseau : ${String(e).slice(0, 80)}` })
  }

  // 2. Theme read
  try {
    const themes = await getThemes(store.shop_domain, store.access_token)
    const main = themes.find((t) => t.role === 'main') ?? themes[0]
    checks.push({
      name: 'Lecture du thème',
      status: main ? 'ok' : 'fail',
      detail: main ? `Thème actif : ${main.name}` : 'Aucun thème principal trouvé',
    })
  } catch {
    checks.push({ name: 'Lecture du thème', status: 'fail', detail: 'Impossible de lister les thèmes' })
  }

  // 3. Theme write (known blocked → informational)
  checks.push({
    name: 'Écriture du thème',
    status: 'warn',
    detail: 'Bloquée par Shopify (exemption requise) — Groupes B/C livrés via Theme App Extension',
  })

  // 4. Products API
  try {
    const products = await getProducts(store.shop_domain, store.access_token, 5)
    checks.push({ name: 'API Produits', status: 'ok', detail: `${products.length >= 5 ? '5+' : products.length} produit(s) lisible(s)` })
  } catch {
    checks.push({ name: 'API Produits', status: 'fail', detail: 'Lecture des produits impossible' })
  }

  // 5–7. Environment keys (presence only, never values)
  checks.push(envCheck('Clé Anthropic (IA)', 'ANTHROPIC_API_KEY'))
  checks.push(envCheck('Clé PageSpeed', 'GOOGLE_PAGESPEED_API_KEY'))
  checks.push(envCheck('Clé Resend (email)', 'RESEND_API_KEY'))

  // 8. Database tables (migrations applied?)
  const missingTables: string[] = []
  for (const t of REQUIRED_TABLES) {
    const { error } = await supabase.from(t).select('id', { head: true, count: 'exact' }).limit(1)
    if (error) missingTables.push(t)
  }
  checks.push({
    name: 'Tables Supabase',
    status: missingTables.length ? 'fail' : 'ok',
    detail: missingTables.length ? `Manquantes : ${missingTables.join(', ')} — lancez le script SQL consolidé` : 'Toutes les tables présentes',
  })

  const okCount = checks.filter((c) => c.status === 'ok').length
  const warnCount = checks.filter((c) => c.status === 'warn').length
  const failCount = checks.filter((c) => c.status === 'fail').length

  return { shop: store.shop_domain, checks, okCount, warnCount, failCount }
}

function envCheck(name: string, key: string): HealthCheck {
  const present = Boolean(process.env[key])
  return {
    name,
    status: present ? 'ok' : 'warn',
    detail: present ? 'Configurée' : 'Absente — fonctionnalité dégradée',
  }
}
