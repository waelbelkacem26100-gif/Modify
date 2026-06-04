import { NextRequest } from 'next/server'
import { verifyWebhookHmac } from '@/lib/shopify'

export interface WebhookPayload {
  shop_id?: number
  shop_domain?: string
  customer?: { id?: number; email?: string; phone?: string }
  orders_to_redact?: number[]
  orders_requested?: number[]
}

/**
 * Reads the RAW body (required for HMAC), verifies the Shopify signature, and
 * parses the JSON payload. `ok` is false if the signature is invalid.
 */
export async function readVerifiedWebhook(
  request: NextRequest
): Promise<{ ok: boolean; payload: WebhookPayload }> {
  const rawBody = await request.text()
  const hmac = request.headers.get('x-shopify-hmac-sha256')
  const ok = verifyWebhookHmac(rawBody, hmac)

  let payload: WebhookPayload = {}
  try {
    payload = rawBody ? (JSON.parse(rawBody) as WebhookPayload) : {}
  } catch {
    // leave payload empty — HMAC check is the gate anyway
  }
  return { ok, payload }
}
