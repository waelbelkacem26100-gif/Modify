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
    default:         return 'b'
  }
}
