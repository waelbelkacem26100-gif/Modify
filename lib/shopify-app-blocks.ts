import { SHOPIFY_API_VERSION, getThemeAsset, updateThemeAsset } from './shopify'

/**
 * Theme app extension UUID for the `modify-blocks` extension. It differs per
 * Partner app registration, so it's configurable per environment; the repo's
 * shopify.extension.toml `uid` is only the local-dev fallback. Set
 * SHOPIFY_THEME_EXTENSION_UUID to the UUID of the extension as deployed under
 * the app actually installed on the merchant's shop.
 */
const THEME_EXTENSION_UUID =
  process.env.SHOPIFY_THEME_EXTENSION_UUID || '237da49c-8579-d5c6-e17c-53e6224177c7093e0338'

/**
 * App handle used in the block type URI (`shopify://apps/<handle>/...`). This is
 * the app's storefront/theme handle, which can DIFFER from the Admin API's
 * `currentAppInstallation.app.handle` (e.g. that returned "modify-test" while the
 * theme editor wrote "modify-2"). When set, this override wins over the API
 * lookup; otherwise we fall back to the live handle.
 */
const APP_HANDLE_OVERRIDE = process.env.SHOPIFY_APP_HANDLE || null

export interface AppBlockSpec {
  /** Block handle = file name under extensions/modify-blocks/blocks/ */
  handle: string
  /** Stable key used for this block inside the JSON template's `blocks` map. */
  blockKey: string
}

/**
 * Maps a Group B audit issue to the app block that resolves it, on Online Store
 * 2.0 / theme-blocks themes (Horizon) where Liquid injection into section files
 * is rejected by Shopify. Returns null for issues with no matching app block.
 */
export function appBlockForFix(fix: { type?: string | null; title?: string | null }): AppBlockSpec | null {
  const hay = `${fix.type ?? ''} ${fix.title ?? ''}`.toLowerCase()
  // Reviews/ratings before trust: the category is often "trust", so a
  // reviews-titled fix must map to social-proof, not trust-badges.
  if (/review|rating|avis|social|proof|customer/.test(hay)) {
    return { handle: 'social-proof', blockKey: 'modify_social_proof' }
  }
  if (/\btrust\b|guarantee|garantie|badge|secur/.test(hay)) {
    return { handle: 'trust-badges', blockKey: 'modify_trust_badges' }
  }
  if (/urgen|scarcit|stock|countdown|compte\s*à\s*rebours/.test(hay)) {
    return { handle: 'urgency', blockKey: 'modify_urgency' }
  }
  return null
}

/** The installed app's handle — authoritative for the block type URI. */
async function getAppHandle(shop: string, accessToken: string): Promise<string | null> {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ currentAppInstallation { app { handle } } }' }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { data?: { currentAppInstallation?: { app?: { handle?: string } } } }
  return data.data?.currentAppInstallation?.app?.handle ?? null
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function isProductSection(s: any): boolean {
  return s && typeof s.type === 'string' && s.type.includes('product')
}

/** Picks the main product section key in a product.json (prefers `main`). */
function pickProductSectionKey(tpl: any): string | null {
  const sections = tpl?.sections ?? {}
  if (isProductSection(sections.main)) return 'main'
  const order: string[] = Array.isArray(tpl?.order) ? tpl.order : Object.keys(sections)
  for (const k of order) if (isProductSection(sections[k])) return k
  return sections.main ? 'main' : null
}

/** Best-effort strip of /* *​/ comments Shopify tolerates in JSON templates. */
function stripJsonComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
}

export type EnableResult =
  | { status: 'applied' }
  | { status: 'already' }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; reason: string }

/**
 * Adds the app block to the theme's product template and ENABLES it. Writing a
 * JSON template doesn't trigger the section-schema validation that rejects
 * theme-blocks section writes (HTTP 422), so this works on Horizon where Liquid
 * injection cannot.
 *
 * Crucially, Shopify SILENTLY DROPS app block references it can't resolve (wrong
 * app handle / extension UUID / extension not deployed). We therefore read the
 * template back and confirm the block persisted — returning `unavailable` (never
 * a false success) when Shopify stripped it.
 */
export async function enableProductAppBlock(
  shop: string,
  accessToken: string,
  themeId: string,
  spec: AppBlockSpec
): Promise<EnableResult> {
  const appHandle = APP_HANDLE_OVERRIDE || (await getAppHandle(shop, accessToken))
  if (!appHandle) return { status: 'error', reason: 'app handle introuvable (currentAppInstallation)' }
  const type = `shopify://apps/${appHandle}/blocks/${spec.handle}/${THEME_EXTENSION_UUID}`
  const marker = `/blocks/${spec.handle}/`

  const asset = await getThemeAsset(shop, accessToken, themeId, 'templates/product.json')
  if (!asset?.value) return { status: 'unavailable', reason: 'templates/product.json absent (thème non OS 2.0)' }

  let tpl: any
  try {
    tpl = JSON.parse(asset.value)
  } catch {
    try { tpl = JSON.parse(stripJsonComments(asset.value)) } catch { return { status: 'error', reason: 'product.json illisible' } }
  }

  const key = pickProductSectionKey(tpl)
  if (!key) return { status: 'unavailable', reason: 'aucune section produit dans product.json' }
  const section = tpl.sections[key]
  section.blocks = section.blocks ?? {}

  // Idempotency: this app block already present → nothing to do.
  if (Object.values(section.blocks).some((b: any) => typeof b?.type === 'string' && b.type.includes(marker))) {
    return { status: 'already' }
  }

  section.blocks[spec.blockKey] = { type, settings: {} }
  section.block_order = Array.isArray(section.block_order) ? section.block_order : []
  if (!section.block_order.includes(spec.blockKey)) section.block_order.push(spec.blockKey)

  await updateThemeAsset(shop, accessToken, themeId, 'templates/product.json', JSON.stringify(tpl, null, 2))

  // Verify the block survived the write — Shopify strips unresolvable app blocks.
  const fresh = await getThemeAsset(shop, accessToken, themeId, 'templates/product.json')
  let freshTpl: any = {}
  try { freshTpl = JSON.parse(fresh?.value ?? '{}') } catch { /* leave empty → treated as not persisted */ }
  const persisted = Object.values(freshTpl?.sections?.[key]?.blocks ?? {}).some(
    (b: any) => typeof b?.type === 'string' && b.type.includes(marker)
  )
  if (!persisted) {
    return {
      status: 'unavailable',
      reason: `Shopify a retiré le bloc app « ${spec.handle} » : extension non déployée/résolue pour l'app « ${appHandle} » (vérifiez SHOPIFY_THEME_EXTENSION_UUID).`,
    }
  }
  return { status: 'applied' }
}
