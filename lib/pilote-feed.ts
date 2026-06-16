// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface PiloteEntry {
  at: string
  kind: 'success' | 'info' | 'trend' | 'alert'
  title: string
  detail?: string
}

// Traduction d'une action audit_logs → entrée lisible du pilote (FR, sans jargon).
const ACTION_LABEL: Record<string, (d: Record<string, unknown>) => { title: string; detail?: string; kind: PiloteEntry['kind'] } | null> = {
  autopilot_product_optimized: (d) => ({ title: `Produit optimisé automatiquement${d.title ? ` : « ${d.title} »` : ''}`, detail: Array.isArray(d.changes) ? (d.changes as string[]).join(' · ') : undefined, kind: 'success' }),
  autopilot_regression_restored: (d) => ({ title: 'Régression corrigée automatiquement', detail: `${Array.isArray(d.changes) ? (d.changes as string[]).join(' · ') : ''} (écrasé par ${d.overwritten_by ?? 'une app tierce'})`, kind: 'alert' }),
  autopilot_theme_reinstalled: (d) => ({ title: 'Optimisations réinstallées après changement de thème', detail: typeof d.blocks === 'number' ? `${d.blocks} bloc(s) réinstallé(s)` : undefined, kind: 'success' }),
  autopilot_image_optimized: (d) => ({ title: 'Images compressées & renommées', detail: typeof d.count === 'number' ? `${d.count} image(s)` : undefined, kind: 'success' }),
  autopilot_conversion_analysis: (d) => ({ title: 'Analyse de conversion hebdomadaire', detail: typeof d.optimized === 'number' ? `${d.optimized} fiche(s) améliorée(s) à partir des meilleures` : undefined, kind: 'trend' }),
  autopilot_article_published: (d) => ({ title: `Article SEO publié${d.title ? ` : « ${d.title} »` : ''}`, kind: 'success' }),
  autopilot_competitor_alert: (d) => ({ title: 'Alerte concurrentielle', detail: typeof d.summary === 'string' ? d.summary : undefined, kind: 'alert' }),
  autopilot_trend_prediction: (d) => ({ title: 'Tendance détectée', detail: typeof d.summary === 'string' ? d.summary : undefined, kind: 'trend' }),
  autopilot_price_suggestion: (d) => ({ title: 'Suggestions de prix prêtes', detail: typeof d.count === 'number' ? `${d.count} produit(s) — en attente de votre accord` : undefined, kind: 'info' }),
  audit_started: () => ({ title: 'Analyse complète lancée', kind: 'info' }),
  audit_completed: (d) => ({ title: 'Analyse complète terminée', detail: `${d.problems ?? 0} points détectés`, kind: 'success' }),
  audit_module_checks: (d) => ({ title: `Vérification ${d.module === 'geo_simulation' ? 'lisibilité IA (GEO)' : 'accessibilité'}`, detail: `${d.checks ?? 0} contrôles déterministes`, kind: 'info' }),
  seo_fix_all_applied: () => ({ title: 'Corrections SEO appliquées automatiquement', kind: 'success' }),
  verification_passed: () => ({ title: 'Vérification post-correction réussie', detail: 'changement confirmé sur la boutique', kind: 'success' }),
  weekly_report_sent: () => ({ title: 'Rapport hebdomadaire envoyé', kind: 'info' }),
  winning_products_generated: () => ({ title: 'Produits gagnants détectés', kind: 'trend' }),
  rollback_complete: () => ({ title: 'Restauration effectuée (sécurité)', detail: 'une modification a été annulée proprement', kind: 'alert' }),
}

/**
 * Feed du Pilote automatique : agrège l'activité d'automatisation RÉELLE déjà
 * journalisée (audit_logs) + les événements webhooks reçus (webhook_events).
 * Aucune donnée inventée — uniquement ce que Modify a réellement fait.
 */
export async function buildPiloteFeed(storeId: string, supabase: SupabaseClient): Promise<PiloteEntry[]> {
  const entries: PiloteEntry[] = []

  const { data: logs } = await supabase
    .from('audit_logs').select('action, details, created_at').eq('store_id', storeId)
    .order('created_at', { ascending: false }).limit(60)
  for (const l of (logs ?? []) as { action: string; details: Record<string, unknown>; created_at: string }[]) {
    const map = ACTION_LABEL[l.action]
    if (!map) continue
    const r = map(l.details ?? {})
    if (r) entries.push({ at: l.created_at, kind: r.kind, title: r.title, detail: r.detail })
  }

  // Événements webhooks (nouveaux produits reçus par le pilote).
  const { data: events } = await supabase
    .from('webhook_events').select('event_type, payload, created_at, processed_at').eq('store_id', storeId)
    .order('created_at', { ascending: false }).limit(20)
  for (const e of (events ?? []) as { event_type: string; payload: { title?: string }; created_at: string; processed_at: string | null }[]) {
    if (e.event_type === 'products/create') {
      entries.push({
        at: e.created_at, kind: 'info',
        title: `Nouveau produit reçu${e.payload?.title ? ` : « ${e.payload.title} »` : ''}`,
        detail: e.processed_at ? 'optimisé automatiquement' : 'en file d’optimisation',
      })
    }
  }

  return entries.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 40)
}

/** Date relative courte FR. */
export function relativeFr(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'hier'
  if (d < 30) return `il y a ${d} jours`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
