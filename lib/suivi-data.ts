import { planById } from '@/lib/pricing'
import { CATEGORY_ORDER } from '@/lib/audit/types'
import type { SuiviData, DomainScore } from '@/components/dashboard/SuiviContent'
import type { Store, Conversion, Fix, AuditResult } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// Noms courts pour l'axe Y du graphique par domaine (v10.1).
const DOMAIN_SHORT: Record<string, string> = {
  products: 'Produits',
  uiux: 'Apparence',
  perf_seo: 'Vitesse / SEO',
  trust: 'Confiance',
  funnel: 'Tunnel d’achat',
  mobile: 'Mobile',
  competitive: 'Concurrence',
}

// Pénalité de score par priorité de problème (calibrée sur le score global 0–100).
const PRIORITY_PENALTY: Record<string, number> = { high: 15, medium: 8, low: 4 }

/**
 * Dérive un score 0–100 + impact €/mois par domaine, à partir des problèmes
 * RÉELS du dernier audit. Aucun chiffre inventé : un domaine sans problème
 * détecté vaut 100 (rien à corriger), l'impact agrège les manques à gagner.
 */
function buildDomains(auditResults: AuditResult[]): DomainScore[] {
  if (auditResults.length === 0) return []
  return CATEGORY_ORDER.map((key) => {
    const items = auditResults.filter((r) => r.category === key)
    const penalty = items.reduce((s, r) => s + (PRIORITY_PENALTY[r.priority] ?? 8), 0)
    const score = Math.max(0, Math.min(100, 100 - penalty))
    const impact = -items.reduce((s, r) => s + (r.impact_euros || 0), 0)
    return { key, label: DOMAIN_SHORT[key] ?? key, score, impact }
  })
}

/**
 * Construit les données de la page 📊 Impact & Résultats à partir de la base.
 * Partagé entre la page authentifiée (/dashboard/resultats) et la preview
 * publique (/preview/resultats) — une seule source de vérité.
 */
export async function buildSuiviData(store: Store, plan: 'free' | 'pro' | string, supabase: SupabaseClient): Promise<SuiviData> {
  const planMeta = planById(plan as 'free' | 'pro')

  // Conversions depuis l'installation (cap 120 jours)
  const since = new Date(Math.max(new Date(store.created_at).getTime(), Date.now() - 120 * 864e5))
    .toISOString().split('T')[0]
  const { data: conv } = await supabase
    .from('conversions').select('*').eq('store_id', store.id)
    .gte('date', since).order('date', { ascending: true })
  const conversions = (conv ?? []) as Conversion[]
  const mid = Math.floor(conversions.length / 2)
  const avg = (arr: Conversion[]) => arr.length ? arr.reduce((s, c) => s + c.conversion_rate, 0) / arr.length : 0
  const avgBefore = avg(conversions.slice(0, mid))
  const avgAfter = avg(conversions.slice(mid))
  const uplift = avgBefore > 0 ? ((avgAfter - avgBefore) / avgBefore) * 100 : 0

  // Tous les correctifs appliqués (tous audits) + impact
  const { data: audits } = await supabase.from('audits').select('id').eq('store_id', store.id)
  const auditIds = (audits ?? []).map((a: { id: string }) => a.id)
  const { data: fixesRows } = auditIds.length
    ? await supabase.from('fixes').select('id, title, type, impact_euros, created_at, status')
        .in('audit_id', auditIds).eq('status', 'applied').order('created_at', { ascending: false })
    : { data: [] }
  // Dédup par issue (type + titre normalisé) : un même problème corrigé sur
  // plusieurs audits ne doit apparaître — ni compter dans le total — qu'une
  // seule fois. Rows triées created_at desc ⇒ on garde la plus récente.
  const seenIssues = new Set<string>()
  const appliedFixes = ((fixesRows ?? []) as Pick<Fix, 'id' | 'title' | 'type' | 'impact_euros' | 'created_at' | 'status'>[])
    .filter((f) => {
      const key = `${f.type}::${(f.title ?? '').trim().toLowerCase()}`
      if (seenIssues.has(key)) return false
      seenIssues.add(key)
      return true
    })
    .map((f) => ({ id: f.id, title: f.title, impact_euros: f.impact_euros, created_at: f.created_at }))
    .sort((a, b) => b.impact_euros - a.impact_euros)
  const recovered = appliedFixes.reduce((s, f) => s + f.impact_euros, 0)
  const firstFixDate = appliedFixes.length
    ? [...appliedFixes].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0].created_at
    : undefined

  // Historique de score
  const { data: snaps } = await supabase
    .from('store_score_snapshots').select('score, created_at').eq('store_id', store.id)
    .order('created_at', { ascending: true }).limit(26)
  const scoreHistory = ((snaps ?? []) as { score: number; created_at: string }[])
    .map((s) => ({ date: new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), score: s.score }))
  const currentScore = scoreHistory.length ? scoreHistory[scoreHistory.length - 1].score : 0

  const { count: articles } = await supabase.from('blog_articles').select('id', { count: 'exact', head: true }).eq('store_id', store.id)
  const { count: winningProducts } = await supabase.from('winning_products').select('id', { count: 'exact', head: true }).eq('store_id', store.id)

  // Scores par domaine — issus du dernier audit (résultats réels).
  const { data: latestAudit } = await supabase
    .from('audits').select('results').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const domains = buildDomains((latestAudit?.results ?? []) as AuditResult[])

  return {
    planName: planMeta.name,
    planPrice: planMeta.priceEur,
    recovered,
    roiMultiple: planMeta.priceEur > 0 ? Math.round(recovered / planMeta.priceEur) : 0,
    fixesApplied: appliedFixes.length,
    articles: articles ?? 0,
    winningProducts: winningProducts ?? 0,
    currentScore,
    avgBefore,
    avgAfter,
    uplift,
    firstFixDate,
    conversions,
    scoreHistory,
    appliedFixes,
    domains,
  }
}
