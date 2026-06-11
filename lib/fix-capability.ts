/**
 * What Modify can HONESTLY do for a given fix. Drives the badge and the action
 * button — and prevents ever showing "Appliqué" for something Modify can't do.
 *
 * - auto     ✅ Modify s'en occupe : meta titles, descriptions, alt texts, trust
 *               badges, urgency, cross-sell, image compression, JSON-LD.
 * - generate 🎨 Modify génère : product/lifestyle photos via DALL·E 3, uploaded
 *               to Shopify.
 * - guide    👋 Guide disponible : real customer reviews, videos, authentic
 *               photos — Modify can't fabricate these; it guides the merchant.
 */
export type FixCapability = 'auto' | 'generate' | 'guide'

export interface CapabilityMeta {
  emoji: string
  label: string
  cls: string
  canApply: boolean
}

export const CAPABILITY_META: Record<FixCapability, CapabilityMeta> = {
  auto: { emoji: '✅', label: "Modify s'en occupe", cls: 'text-success bg-success/10 border-success/20', canApply: true },
  generate: { emoji: '🎨', label: 'Modify génère', cls: 'text-primary bg-primary/10 border-primary/20', canApply: true },
  guide: { emoji: '👋', label: 'Guide disponible', cls: 'text-sky-400 bg-sky-400/10 border-sky-400/20', canApply: false },
}

export function fixCapability(fix: { type?: string | null; title?: string | null }): FixCapability {
  const h = `${fix.type ?? ''} ${fix.title ?? ''}`.toLowerCase()

  // 👋 Real reviews and videos: Modify can't create these.
  if (/\breview|avis|rating|note client|témoignage|testimonial/.test(h)) return 'guide'
  if (/\bvideo|vidéo/.test(h)) return 'guide'

  // 🎨 Lifestyle / in-situation product photos → DALL·E 3 generates these
  // (checked before the "real photo" guide rule, since "situation réelle" = lifestyle).
  if (/lifestyle|situation réelle|en situation|mise en situation|mise en scène|en contexte/.test(h)) return 'generate'

  // 👋 Authentic photos the merchant must take themselves (not lifestyle renders).
  if (/(vraie|authentique|real|authentic)[^.]{0,14}(photo|image)|(photo|image)[^.]{0,14}(authentique|du produit réel|client)/.test(h)) return 'guide'

  // ✅ Clearly auto-applied things (before the image heuristic so "alt text" /
  // "image compression" stay auto, not "generate").
  if (/alt|compress|poids|seo|meta|titre|description|badge|trust|secur|garantie|urgen|stock|cross|upsell|bundle|panier|json|structur|prix|price|promo|vitesse|speed/.test(h)) return 'auto'

  // 🎨 Too few / missing product photos → generate with DALL·E 3.
  if (/(few|peu|insuffis|insufficient|more|manqu|ajout)[^.]{0,24}(photo|image|visuel)|(photo|image|visuel)[^.]{0,24}(manqu|insuffis|supplément)/.test(h)) return 'generate'

  return 'auto'
}
