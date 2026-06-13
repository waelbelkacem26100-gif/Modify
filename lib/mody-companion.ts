/**
 * Pont d'ouverture du compagnon Mody (v6).
 *
 * Le compagnon vit dans le layout dashboard (persiste à travers la navigation
 * 🏠 ↔ 📊). N'importe quel composant — bandeau d'activité, bouton « Demander à
 * Mody » d'une carte problème — l'ouvre en émettant un événement global, sans
 * prop-drilling ni contexte qui envelopperait tout l'arbre.
 */

export const MODY_OPEN_EVENT = 'mody:open'

export interface ModyOpenDetail {
  /** Titre exact d'un problème → ouvre directement cette mission. */
  missionTitle?: string | null
}

/** Ouvre le compagnon Mody, éventuellement sur une mission précise. */
export function openMody(missionTitle?: string | null) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ModyOpenDetail>(MODY_OPEN_EVENT, { detail: { missionTitle: missionTitle ?? null } })
  )
}
