import crypto from 'crypto'

/**
 * Verifies a Shopify session token (JWT, HS256 signed with the app's client
 * secret) and returns the shop domain from the `dest` claim. Returns null if
 * the signature, audience, or expiry is invalid.
 * Docs: session token payload — iss/dest/aud/exp/nbf.
 */
export function verifyShopifySessionToken(token: string): { shop: string } | null {
  const secret = process.env.SHOPIFY_CLIENT_SECRET
  const clientId = process.env.SHOPIFY_CLIENT_ID
  if (!secret || !clientId) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts

  // Verify HS256 signature (base64url)
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null
  } catch {
    return null
  }

  let claims: { dest?: string; aud?: string; exp?: number; nbf?: number }
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  // aud must be our app's client_id
  if (claims.aud !== clientId) return null

  const nowSec = Math.floor(Date.now() / 1000)
  if (claims.exp && claims.exp < nowSec) return null
  if (claims.nbf && claims.nbf > nowSec + 5) return null

  if (!claims.dest) return null
  try {
    const shop = new URL(claims.dest).host
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) return null
    return { shop }
  } catch {
    return null
  }
}
