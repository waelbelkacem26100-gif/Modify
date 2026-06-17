import crypto from 'crypto'

/**
 * Signed, expiring token embedded in the weekly approval email's 1-click link.
 * Lets a merchant approve all pending fixes for their store without logging in.
 * HMAC-signed with CRON_SECRET (server-only). Format:
 *   base64url(JSON{store_id,exp}) + "." + base64url(HMAC-SHA256)
 */
const TTL_SECONDS = 8 * 24 * 60 * 60 // 8 days — valid until past the next weekly run

// Signing key = CRON_SECRET only. We deliberately do NOT fall back to
// SHOPIFY_CLIENT_SECRET: reusing the OAuth secret to sign approval links would
// share one key across two trust domains. If CRON_SECRET is unset we fail
// closed — signApprovalToken/verifyApprovalToken return null (no link issued,
// no approval accepted) rather than mint an insecurely-signed token.
function key(): string | null {
  return process.env.CRON_SECRET || null
}

export function signApprovalToken(storeId: string): string | null {
  const k = key()
  if (!k) return null
  const body = Buffer.from(JSON.stringify({ store_id: storeId, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })).toString('base64url')
  const sig = crypto.createHmac('sha256', k).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyApprovalToken(token: string): { storeId: string } | null {
  const k = key()
  if (!k) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = crypto.createHmac('sha256', k).update(body).digest('base64url')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
  } catch {
    return null
  }
  let claims: { store_id?: string; exp?: number }
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null
  if (!claims.store_id) return null
  return { storeId: claims.store_id }
}
