import { NextRequest } from 'next/server'
import { ingestWebhook } from '@/lib/autopilot/webhook-log'

export const runtime = 'nodejs'

/**
 * Webhook `orders/paid` — Pilote automatique v10.
 * Reçoit + vérifie + journalise SANS PII (uniquement id commande, total, et les
 * product_id des lignes). L'alimentation de product_performance + apprentissage
 * (PRD §1.1 / §2) sera branchée ici ultérieurement.
 */
export async function POST(request: NextRequest) {
  const { response } = await ingestWebhook(request, 'orders/paid', (p) => {
    const lines = Array.isArray(p.line_items) ? (p.line_items as { product_id?: number }[]) : []
    return {
      shopifyId: p.id != null ? String(p.id) : null,
      // Aucune donnée client : seulement le total et les produits achetés.
      safePayload: {
        id: p.id,
        total_price: p.total_price,
        currency: p.currency,
        product_ids: lines.map((l) => l.product_id).filter(Boolean),
      },
    }
  })
  return response
}
