import { getProductsDetailed, getSoldProductIds } from '@/lib/shopify'
import type { Store, Audit, Fix, WinningProduct, Conversion } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

function euros(n: number) { return `€${Math.round(n).toLocaleString('fr-FR')}` }

/**
 * Assembles a compact, factual snapshot of EVERYTHING Modify knows about the
 * store — audits, applied/pending fixes, winning products, SEO articles, score,
 * catalogue, best-sellers and conversion — for the accompaniment agent's system
 * prompt. Kept bounded so it stays cache-friendly and cheap.
 */
export async function buildAgentContext(store: Store, supabase: SupabaseClient): Promise<string> {
  const lines: string[] = []
  lines.push(`Boutique : ${store.shop_name ?? store.shop_domain} (${store.shop_domain})`)
  lines.push(`Mode Modify : ${store.mode === 'approval' ? 'approbation hebdomadaire' : 'automatique'}`)

  // Latest audit (v2 : 6 catégories, capability ✅/👋, éléments exacts)
  const { data: audit } = await supabase
    .from('audits').select('*').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const a = audit as Audit | null
  if (a?.results?.length) {
    lines.push(`\nDernier audit (${new Date(a.created_at).toLocaleDateString('fr-FR')}) — ${a.results.length} problèmes détectés, impact total ${euros(a.total_impact_euros ?? 0)}/mois :`)
    for (const r of [...a.results].sort((x, y) => y.impact_euros - x.impact_euros).slice(0, 10)) {
      const cap = r.capability ?? (r.fix_available ? 'auto' : 'guide')
      const items = r.affected_items?.length ? ` [concerne : ${r.affected_items.slice(0, 3).join(', ')}]` : ''
      lines.push(`  • ${cap === 'auto' ? '✅' : '👋'} ${r.title} — ${euros(r.impact_euros)}/mois (priorité ${r.priority})${items}`)
    }
  } else {
    lines.push('\nAucun audit complet récent. (Tu peux proposer d’en lancer une avec [ACTION:launch_audit].)')
  }

  // Fixes — applied (recovered) + pending (proactive suggestions)
  const auditIds: string[] = []
  {
    const { data: audits } = await supabase.from('audits').select('id').eq('store_id', store.id)
    for (const x of (audits ?? []) as { id: string }[]) auditIds.push(x.id)
  }
  if (auditIds.length) {
    const { data: fixes } = await supabase
      .from('fixes').select('id, title, impact_euros, status').in('audit_id', auditIds)
    const all = (fixes ?? []) as Pick<Fix, 'id' | 'title' | 'impact_euros' | 'status'>[]
    const applied = all.filter((f) => f.status === 'applied')
    const pending = all.filter((f) => f.status === 'pending').sort((x, y) => y.impact_euros - x.impact_euros)
    const recovered = applied.reduce((s, f) => s + (f.impact_euros ?? 0), 0)
    lines.push(`\nCorrectifs : ${applied.length} appliqués (${euros(recovered)}/mois récupérés).`)
    if (pending.length) {
      lines.push(`Correctifs NON encore appliqués (à suggérer proactivement — utilise [ACTION:apply_fix:<id>] avec l'id exact) :`)
      for (const f of pending.slice(0, 6)) lines.push(`  • id=${f.id} | ${f.title} — gain potentiel ${euros(f.impact_euros)}/mois`)
    }
  }

  // Score
  const { data: snap } = await supabase
    .from('store_score_snapshots').select('score').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (snap?.score != null) lines.push(`\nScore Modify actuel : ${snap.score}/100`)

  // Winning products
  const { data: wp } = await supabase
    .from('winning_products').select('name, score, recommended_price_eur')
    .eq('store_id', store.id).order('created_at', { ascending: false }).limit(5)
  const wins = (wp ?? []) as Pick<WinningProduct, 'name' | 'score' | 'recommended_price_eur'>[]
  if (wins.length) {
    lines.push(`\nProduits gagnants récemment suggérés :`)
    for (const w of wins) lines.push(`  • ${w.name} (${w.score}, prix conseillé ${euros(w.recommended_price_eur)})`)
  }

  // SEO articles
  const { count: articles } = await supabase
    .from('blog_articles').select('id', { count: 'exact', head: true }).eq('store_id', store.id)
  lines.push(`\nArticles de blog SEO publiés : ${articles ?? 0}`)

  // Conversion (last 60 days)
  const sixty = new Date(Date.now() - 60 * 864e5).toISOString().split('T')[0]
  const { data: conv } = await supabase
    .from('conversions').select('conversion_rate, revenue, date').eq('store_id', store.id)
    .gte('date', sixty).order('date', { ascending: true })
  const c = (conv ?? []) as Pick<Conversion, 'conversion_rate' | 'revenue' | 'date'>[]
  if (c.length) {
    const mid = Math.floor(c.length / 2)
    const avg = (arr: typeof c) => arr.length ? arr.reduce((s, x) => s + x.conversion_rate, 0) / arr.length : 0
    const before = avg(c.slice(0, mid)), after = avg(c.slice(mid))
    const uplift = before > 0 ? Math.round(((after - before) / before) * 100) : 0
    const revenue = c.reduce((s, x) => s + (x.revenue ?? 0), 0)
    lines.push(`\nConversion (60 j) : ${after.toFixed(1)}% (${uplift >= 0 ? '+' : ''}${uplift}% vs période précédente). Revenu sur la période : ${euros(revenue)}.`)
  }

  // Catalogue + best-sellers (light Shopify reads, tolerant)
  try {
    const products = await getProductsDetailed(store.shop_domain, store.access_token, 40)
    lines.push(`\nCatalogue : ${products.length} produits actifs. Exemples : ${products.slice(0, 10).map((p) => p.title).join(', ')}.`)
    const since = new Date(Date.now() - 90 * 864e5).toISOString()
    const sold = await getSoldProductIds(store.shop_domain, store.access_token, since)
    const best = products.filter((p) => sold.has(p.id)).map((p) => p.title).slice(0, 6)
    if (best.length) lines.push(`Best-sellers (90 j) : ${best.join(', ')}.`)
  } catch { /* tolerant — context still useful without it */ }

  return lines.join('\n')
}
