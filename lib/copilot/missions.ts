import { getProductsDetailed } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import { missionTypeForProblem, MISSION_TO_GUIDE_TYPE, MISSION_META, type MissionType } from './mission-types'
import { generateMissionContent, type MissionContext } from './mission-runner'
import type { Problem } from '@/lib/audit/types'
import type { Store, Audit } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * Une mission = un problème 👋 Guide du dernier audit + (si démarrée) son guide
 * de contenu généré. Le lien problème ↔ guide est journalisé dans audit_logs
 * (action 'mission_created') — pattern zéro-DDL éprouvé par la progression d'audit.
 */
export interface Mission {
  problem_id: string
  type: MissionType
  emoji: string
  type_label: string
  problem_title: string
  problem_description: string
  impact_euros: number
  priority: 'high' | 'medium' | 'low'
  affected_items: string[]
  /** none = pas encore lancée · in_progress · done */
  status: 'none' | 'in_progress' | 'done'
  guide_id: string | null
  steps_done: number
  steps_total: number
}

interface GuideRow {
  id: string
  title: string
  status: 'todo' | 'done'
  steps: { title: string; detail: string; done?: boolean }[] | null
}

async function latestCompletedAudit(storeId: string, supabase: SupabaseClient): Promise<Audit | null> {
  const { data } = await supabase
    .from('audits').select('*').eq('store_id', storeId).eq('status', 'completed')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as Audit) ?? null
}

/** Problèmes 👋 Guide du dernier audit (la matière première des missions). */
function guideProblems(audit: Audit | null): Problem[] {
  if (!audit?.results?.length) return []
  return (audit.results as Problem[]).filter(
    (p) => (p.capability ?? (p.fix_available ? 'auto' : 'guide')) === 'guide'
  )
}

/** Liste les missions du dernier audit, avec leur état réel (guide lié, étapes cochées). */
export async function listMissions(store: Store, supabase: SupabaseClient): Promise<{ audit_id: string | null; missions: Mission[] }> {
  const audit = await latestCompletedAudit(store.id, supabase)
  const problems = guideProblems(audit)
  if (!audit || problems.length === 0) return { audit_id: audit?.id ?? null, missions: [] }

  // Liens mission ↔ guide déjà créés pour cet audit.
  const { data: links } = await supabase
    .from('audit_logs').select('details')
    .eq('action', 'mission_created').eq('details->>audit_id', audit.id)
  const guideByProblem = new Map<string, string>()
  for (const l of (links ?? []) as { details: { problem_id?: string; guide_id?: string } }[]) {
    if (l.details?.problem_id && l.details?.guide_id) guideByProblem.set(l.details.problem_id, l.details.guide_id)
  }

  const guideIds = [...guideByProblem.values()]
  const guides = new Map<string, GuideRow>()
  if (guideIds.length) {
    const { data } = await supabase
      .from('guides').select('id, title, status, steps').in('id', guideIds)
    for (const g of (data ?? []) as GuideRow[]) guides.set(g.id, g)
  }

  const missions = problems
    .map((p): Mission => {
      const type = missionTypeForProblem(p)
      const guideId = guideByProblem.get(p.id) ?? null
      const guide = guideId ? guides.get(guideId) : undefined
      const steps = Array.isArray(guide?.steps) ? guide!.steps : []
      const stepsDone = steps.filter((s) => s.done).length
      return {
        problem_id: p.id,
        type,
        emoji: MISSION_META[type].emoji,
        type_label: MISSION_META[type].label,
        problem_title: p.title,
        problem_description: p.description,
        impact_euros: p.impact_euros,
        priority: p.priority,
        affected_items: p.affected_items ?? [],
        status: !guide ? 'none' : guide.status === 'done' ? 'done' : 'in_progress',
        guide_id: guideId,
        steps_done: stepsDone,
        steps_total: steps.length,
      }
    })
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 }
      return rank[a.priority] - rank[b.priority] || b.impact_euros - a.impact_euros
    })

  return { audit_id: audit.id, missions }
}

/**
 * Démarre une mission : génère son contenu réel (briefs, emails, scripts…),
 * le persiste comme guide, et journalise le lien problème ↔ guide.
 * Idempotent : si la mission existe déjà pour ce problème, la retourne.
 */
export async function startMission(store: Store, problemId: string, supabase: SupabaseClient): Promise<{ guide_id: string; created: boolean }> {
  const audit = await latestCompletedAudit(store.id, supabase)
  const problem = guideProblems(audit).find((p) => p.id === problemId)
  if (!audit || !problem) throw new Error('PROBLEM_NOT_FOUND')

  // Déjà lancée ? (idempotence — un double-clic ne génère pas deux fois)
  const { data: existing } = await supabase
    .from('audit_logs').select('details').eq('action', 'mission_created')
    .eq('details->>audit_id', audit.id).eq('details->>problem_id', problemId)
    .limit(1).maybeSingle()
  if (existing?.details?.guide_id) return { guide_id: existing.details.guide_id, created: false }

  const type = missionTypeForProblem(problem)

  // Contexte réel : catalogue Shopify (tolérant — la mission marche sans).
  let products: { title: string; price: string | null }[] = []
  let niche = 'e-commerce'
  try {
    const detailed = await getProductsDetailed(store.shop_domain, store.access_token, 30)
    products = detailed.map((p) => ({ title: p.title, price: p.variants?.[0]?.price ?? null }))
    const types = new Set(detailed.map((p) => p.product_type).filter(Boolean))
    if (types.size) niche = [...types].slice(0, 6).join(', ')
  } catch { /* contexte minimal */ }

  const ctx: MissionContext = {
    shopName: store.shop_name ?? store.shop_domain,
    storeHandle: store.shop_domain.replace('.myshopify.com', ''),
    niche,
    problemTitle: problem.title,
    problemDescription: problem.description,
    recommendation: problem.recommendation,
    impactEuros: problem.impact_euros,
    affectedItems: problem.affected_items ?? [],
    products,
  }

  const generated = await generateMissionContent(type, ctx)

  const { data: saved, error } = await supabase.from('guides').insert({
    store_id: store.id,
    type: MISSION_TO_GUIDE_TYPE[type],
    title: generated.title,
    impact_euros: problem.impact_euros,
    summary: generated.summary,
    steps: generated.steps,
    status: 'todo',
  }).select('id').single()
  if (error || !saved) throw new Error(`Mission save failed: ${error?.message ?? 'no row'}`)

  await logAction(supabase, store.id, 'mission_created', {
    audit_id: audit.id,
    problem_id: problemId,
    guide_id: saved.id,
    mission_type: type,
    problem_title: problem.title,
  }, 'success')

  return { guide_id: saved.id, created: true }
}
