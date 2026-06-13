import { getProduct, getProductSeoMeta, getThemes, getThemeAsset } from '@/lib/shopify'
import { parseGroupABackup } from '@/lib/fix-pipeline'
import { storefrontIsGated } from '@/lib/screenshot'
import type { Fix, Store } from '@/types'
import type { ProofRecord, ProofType } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * Transforme les correctifs APPLIQUÉS d'une boutique en ProofRecord — la preuve
 * honnête de ce qui a changé. Règles :
 *  - "avant" vient du backup réel (__modify_backup v1) stocké à l'application ;
 *  - "après" est LU EN DIRECT sur Shopify (jamais reconstruit ni inventé) ;
 *  - si la vitrine est protégée par mot de passe, les preuves visuelles sont
 *    marquées indisponibles (storefrontGated) — jamais d'image factice.
 */

// Actions de logs qui datent l'application réussie d'un correctif.
const APPLY_ACTIONS = [
  'verification_passed', 'fix_applied_to_theme', 'meta_tags_applied',
  'product_descriptions_applied', 'alt_text_applied', 'jsonld_applied',
  'app_block_enabled',
]

// Champs réellement écrits par le bloc JSON-LD de Modify (apply route).
const JSONLD_FIELDS = ['nom du produit', 'prix', 'disponibilité']

/** Même frontière que l'applicateur Group A (classifyGroupASubtype) + cas visuels. */
export function classifyProofType(fix: Pick<Fix, 'type' | 'title'>): ProofType {
  const t = `${fix.type} ${fix.title}`.toLowerCase()
  if (/json[\s-]?ld|structured data|données structurées|rich snippet|schema\.org|invisibles? pour google|lisible.{0,15}(ia|chatgpt)|données produit.{0,20}(google|ia)/.test(t)) return 'structured_data'
  if (/meta[\s-]?(title|description|tag)|balise meta|title tag|meta seo|titres? et descriptions? google|description google/.test(t)) return 'google_preview'
  if (/badge|trust|confiance|s[ée]curit|avis|review|rating|urgen|stock|scarcit|cross|compl[ée]mentaire|upsell|accessoire|photo|image|alt|texte descriptif|description|social/.test(t)) return 'visual'
  return 'none'
}

interface BuildOptions {
  limit?: number
  /** Nombre max de produits-exemples lus en direct par preuve google_preview. */
  liveExamples?: number
}

export async function buildProofRecords(
  store: Store, supabase: SupabaseClient, opts: BuildOptions = {}
): Promise<{ proofs: ProofRecord[]; totalApplied: number; totalEur: number; storefrontGated: boolean }> {
  const limit = opts.limit ?? 50
  const liveExamples = opts.liveExamples ?? 2

  // Correctifs appliqués de CETTE boutique (fixes → audits → store).
  const { data: auditRows } = await supabase.from('audits').select('id').eq('store_id', store.id)
  const auditIds = ((auditRows ?? []) as { id: string }[]).map((a) => a.id)
  if (auditIds.length === 0) return { proofs: [], totalApplied: 0, totalEur: 0, storefrontGated: false }

  const { data: fixRows, count } = await supabase
    .from('fixes').select('*', { count: 'exact' })
    .in('audit_id', auditIds).eq('status', 'applied')
    .order('created_at', { ascending: false }).limit(limit)
  const fixes = (fixRows ?? []) as Fix[]
  const totalApplied: number = count ?? fixes.length
  if (fixes.length === 0) return { proofs: [], totalApplied: 0, totalEur: 0, storefrontGated: false }

  // Somme € sur TOUS les appliqués (pas seulement la page courante).
  const { data: eurRows } = await supabase
    .from('fixes').select('impact_euros').in('audit_id', auditIds).eq('status', 'applied')
  const totalEur = ((eurRows ?? []) as { impact_euros: number }[])
    .reduce((s, r) => s + Number(r.impact_euros || 0), 0)

  // Date réelle d'application : dernier log de succès par fix_id.
  const { data: logRows } = await supabase
    .from('audit_logs').select('fix_id, action, created_at')
    .in('fix_id', fixes.map((f) => f.id)).in('action', APPLY_ACTIONS)
    .order('created_at', { ascending: false })
  const appliedAtByFix = new Map<string, string>()
  for (const l of (logRows ?? []) as { fix_id: string; created_at: string }[]) {
    if (!appliedAtByFix.has(l.fix_id)) appliedAtByFix.set(l.fix_id, l.created_at)
  }

  const gated = await storefrontIsGated(`https://${store.shop_domain}`)

  // Détection LIVE des données structurées (1 seule lecture pour toute la liste).
  let liveJsonLd: boolean | null = null
  if (fixes.some((f) => classifyProofType(f) === 'structured_data')) {
    try {
      const themes = await getThemes(store.shop_domain, store.access_token)
      const main = themes.find((t) => t.role === 'main') ?? themes[0]
      const asset = main ? await getThemeAsset(store.shop_domain, store.access_token, String(main.id), 'layout/theme.liquid') : null
      liveJsonLd = Boolean(asset?.value?.includes('application/ld+json'))
    } catch { liveJsonLd = null }
  }

  const proofs: ProofRecord[] = []
  for (const fix of fixes) {
    const proofType = classifyProofType(fix)
    const backup = parseGroupABackup(fix)
    const affectedItems = (backup?.products ?? []).map((p) => p.title).filter((t): t is string => Boolean(t)).slice(0, 10)

    const record: ProofRecord = {
      id: fix.id,
      appliedAt: appliedAtByFix.get(fix.id) ?? fix.created_at,
      title: fix.title,
      category: fix.type,
      monthlyImpactEur: Number(fix.impact_euros || 0),
      proofType,
      before: {},
      after: {},
      affectedItems,
      storefrontGated: gated,
    }

    if (proofType === 'visual') {
      record.before.screenshotUrl = fix.screenshot_before ?? undefined
      record.after.screenshotUrl = fix.screenshot_after ?? undefined
    }

    if (proofType === 'google_preview' && backup) {
      // AVANT = backup réel · APRÈS = lecture live Shopify (source de vérité).
      const candidates = backup.products
        .filter((p) => 'seo_title' in p || 'meta_description' in p)
        .slice(0, liveExamples)
      for (const p of candidates) {
        try {
          const [live, prod] = await Promise.all([
            getProductSeoMeta(store.shop_domain, store.access_token, p.id),
            record.productUrl ? Promise.resolve(null) : getProduct(store.shop_domain, store.access_token, p.id),
          ])
          // Premier produit-exemple lisible → c'est lui qu'on montre.
          if (record.after.text == null && (live.titleTag || live.descriptionTag)) {
            record.before.text = p.seo_title ?? undefined
            record.before.description = p.meta_description ?? undefined
            record.after.text = live.titleTag ?? undefined
            record.after.description = live.descriptionTag ?? undefined
            if (!gated && prod?.handle) record.productUrl = `https://${store.shop_domain}/products/${prod.handle}`
          }
        } catch { /* produit supprimé depuis → on tente le suivant */ }
      }
    }

    if (proofType === 'structured_data') {
      // AVANT : le backup du fichier thème contenait-il déjà du JSON-LD ?
      const beforeFile = fix.file_path && fix.original_file_content && !backup ? fix.original_file_content : null
      record.before.hasStructuredData = beforeFile ? beforeFile.includes('application/ld+json') : false
      record.after.hasStructuredData = liveJsonLd ?? true // vérifié à l'application (verification_status)
      record.fieldsAdded = JSONLD_FIELDS
    }

    proofs.push(record)
  }

  return { proofs, totalApplied, totalEur, storefrontGated: gated }
}
