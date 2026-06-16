import { NextRequest, after } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { ingestWebhook } from '@/lib/autopilot/webhook-log'
import { reinstallAppBlocks } from '@/lib/autopilot/theme-reinstall'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Webhook `themes/publish` — Pilote automatique v10 (Étape 4).
 * Journalise puis réinstalle automatiquement les App Blocks Modify sur le
 * nouveau thème actif (idempotent). Aucune optimisation perdue au changement de thème.
 */
export async function POST(request: NextRequest) {
  const { response, store, eventId } = await ingestWebhook(request, 'themes/publish', (p) => ({
    shopifyId: p.id != null ? String(p.id) : null,
    safePayload: { id: p.id, name: p.name, role: p.role },
  }))

  if (store && eventId) {
    const storeRef = store
    after(async () => {
      const supabase = await createServiceRoleClient()
      try {
        await getValidAccessToken(storeRef, supabase)
        const r = await reinstallAppBlocks(storeRef, supabase)
        await supabase.from('webhook_events').update({
          processed_at: new Date().toISOString(),
          result: { status: 'reinstalled', blocks: r.reinstalled, specs: r.specs },
        }).eq('id', eventId)
      } catch (e) {
        await supabase.from('webhook_events').update({
          processed_at: new Date().toISOString(), result: { status: 'error', error: String(e).slice(0, 300) },
        }).eq('id', eventId)
      }
    })
  }

  return response
}
