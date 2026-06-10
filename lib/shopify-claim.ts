import crypto from 'crypto'

/**
 * Short-lived, signed proof that the bearer controls a given Shopify shop's
 * admin. Minted ONLY by the token-exchange route, which has already verified a
 * Shopify session token for that shop — so a valid claim token is genuine proof
 * of shop ownership. The dashboard uses it to safely re-assign a sentinel store
 * (`user_id = shopify:<shop>`, created during install) to the Clerk user who is
 * now signing in, WITHOUT trusting an attacker-supplied `?shop=` value.
 *
 * Format: base64url(JSON{shop,exp}) + "." + base64url(HMAC-SHA256 of that body),
 * keyed with the app's client secret.
 */
const CLAIM_TTL_SECONDS = 15 * 60 // 15 min — enough time to sign up / sign in.

function secret(): string | null {
  return process.env.SHOPIFY_CLIENT_SECRET ?? null
}

export function signShopClaim(shop: string): string | null {
  const key = secret()
  if (!key) return null
  const body = Buffer.from(
    JSON.stringify({ shop, exp: Math.floor(Date.now() / 1000) + CLAIM_TTL_SECONDS })
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', key).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyShopClaim(token: string): { shop: string } | null {
  const key = secret()
  if (!key) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts

  const expected = crypto.createHmac('sha256', key).update(body).digest('base64url')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
  } catch {
    return null
  }

  let claims: { shop?: string; exp?: number }
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null
  if (!claims.shop || !/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(claims.shop)) return null
  return { shop: claims.shop }
}
