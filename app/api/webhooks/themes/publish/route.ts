import { NextRequest } from 'next/server'
import { ingestWebhook } from '@/lib/autopilot/webhook-log'

export const runtime = 'nodejs'

/**
 * Webhook `themes/publish` — Pilote automatique v10.
 * Reçoit + vérifie + journalise (non destructif). La réinstallation des App
 * Blocks + re-vérification (PRD §1.1) sera branchée ici ultérieurement.
 */
export async function POST(request: NextRequest) {
  const { response } = await ingestWebhook(request, 'themes/publish', (p) => ({
    shopifyId: p.id != null ? String(p.id) : null,
    safePayload: { id: p.id, name: p.name, role: p.role },
  }))
  return response
}
