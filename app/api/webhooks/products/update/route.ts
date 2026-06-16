import { NextRequest } from 'next/server'
import { ingestWebhook } from '@/lib/autopilot/webhook-log'

export const runtime = 'nodejs'

/**
 * Webhook `products/update` — Pilote automatique v10.
 * Reçoit + vérifie + journalise (non destructif). La détection de régression /
 * restauration automatique (PRD §1.1) sera branchée ici ultérieurement.
 */
export async function POST(request: NextRequest) {
  const { response } = await ingestWebhook(request, 'products/update', (p) => ({
    shopifyId: p.id != null ? String(p.id) : null,
    safePayload: { id: p.id, title: p.title, updated_at: p.updated_at },
  }))
  return response
}
