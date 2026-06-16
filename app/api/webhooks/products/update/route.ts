import { NextRequest, after } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { ingestWebhook } from '@/lib/autopilot/webhook-log'
import { checkAndRestore } from '@/lib/autopilot/regression'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Webhook `products/update` — Pilote automatique v10 (Étape 3).
 * Reçoit + vérifie + journalise, puis vérifie en arrière-plan si une app tierce
 * a écrasé le SEO posé par Modify → restauration automatique. Garde anti-boucle :
 * checkAndRestore ignore l'écho de nos propres écritures (< 90s).
 */
export async function POST(request: NextRequest) {
  const { response, store, eventId, shopifyId } = await ingestWebhook(request, 'products/update', (p) => ({
    shopifyId: p.id != null ? String(p.id) : null,
    safePayload: { id: p.id, title: p.title, updated_at: p.updated_at },
  }))

  if (store && shopifyId && eventId) {
    const storeRef = store
    after(async () => {
      const supabase = await createServiceRoleClient()
      try {
        await getValidAccessToken(storeRef, supabase)
        const r = await checkAndRestore(storeRef, shopifyId, supabase)
        await supabase.from('webhook_events').update({
          processed_at: new Date().toISOString(),
          result: { status: r.restored ? 'restored' : 'no_action', reason: r.reason, changes: r.changes },
        }).eq('id', eventId)
      } catch (e) {
        await supabase.from('webhook_events').update({
          processed_at: new Date().toISOString(),
          result: { status: 'error', error: String(e).slice(0, 300) },
        }).eq('id', eventId)
      }
    })
  }

  return response
}
