import { createBackupTheme } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

const BACKUP_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Returns the backup theme ID for this session.
 * Reuses an existing backup if it was created within the last 24 hours.
 * Otherwise creates a new "Modify Backup [date] [time]" unpublished theme.
 */
export async function getOrCreateSessionBackup(
  store: Store,
  supabase: SupabaseClient
): Promise<string> {
  // Reuse existing backup if fresh
  if (store.backup_theme_id && store.backup_created_at) {
    const age = Date.now() - new Date(store.backup_created_at).getTime()
    if (age < BACKUP_TTL_MS) {
      return store.backup_theme_id
    }
  }

  // Create new backup theme
  const now = new Date()
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const name = `Modify Backup ${date} ${time}`

  const theme = await createBackupTheme(store.shop_domain, store.access_token, name)
  const backupId = String(theme.id)

  await supabase
    .from('stores')
    .update({ backup_theme_id: backupId, backup_created_at: now.toISOString() })
    .eq('id', store.id)

  await logAction(supabase, store.id, 'backup_theme_created', { backup_theme_id: backupId, name })

  return backupId
}

/**
 * Risk group logic:
 *   a = only Products/metafields API, no Liquid modification
 *   b = theme Liquid changes with medium risk (snippets, CSS, non-critical sections)
 *   c = high-risk theme changes (navigation, checkout, layout) — applied on preview theme
 */
export function computeRiskGroup(category: string): 'a' | 'b' | 'c' {
  switch (category) {
    case 'checkout': return 'c'
    case 'theme':    return 'c'
    case 'product':  return 'a'
    case 'trust':    return 'b'
    case 'speed':    return 'b'
    // Audit v2 categories (6 agents)
    case 'products': return 'a'
    case 'perf_seo': return 'a'
    case 'uiux':     return 'c'
    case 'funnel':   return 'c'
    case 'mobile':   return 'c'
    default:         return 'b'
  }
}

// Matches titles that specifically flag missing/empty product descriptions.
// Deliberately narrow to avoid misclassifying trust/speed issues that merely
// mention "description" in passing (e.g. "Add trust badge after description").
const PRODUCT_DESC_RE =
  /\bproducts?\b.{0,30}\bdescriptions?\b|\bdescriptions?\b.{0,30}\b(missing|absent|lack|empty|manqu|inexistant)\b/i

// No-risk content/SEO fixes handled by Group A handlers (Products/Assets API).
// Tight phrases so Group B/C visual fixes are never pulled in by accident.
const GROUP_A_CONTENT_RE =
  /alt[\s-]?text|alt attribute|texte alternatif|image alt|json[\s-]?ld|structured data|données structurées|rich snippet|schema\.org|meta[\s-]?(title|description|tag)|balise meta|title tag|meta seo/i

/**
 * Authoritative risk group for an issue or stored fix.
 * Overrides whatever Claude returned — product/description + no-risk SEO
 * content fixes (alt text, JSON-LD, meta tags) are always 'a'.
 */
export function classifyRiskGroup(
  category: string,
  title: string,
  claudeRiskGroup?: string | null
): 'a' | 'b' | 'c' {
  if (category === 'product' || category === 'products' || PRODUCT_DESC_RE.test(title) || GROUP_A_CONTENT_RE.test(title)) return 'a'
  if (claudeRiskGroup === 'a' || claudeRiskGroup === 'b' || claudeRiskGroup === 'c') {
    return claudeRiskGroup
  }
  return computeRiskGroup(category)
}
