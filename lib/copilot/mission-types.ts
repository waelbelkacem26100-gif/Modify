import type { Problem } from '@/lib/audit/types'

/**
 * Modify Copilot — types de missions.
 *
 * Une mission naît d'un problème 👋 Guide (ce que Modify ne peut pas corriger
 * automatiquement pour des raisons légales/techniques) et se range dans l'un
 * de ces 6 types. Chaque type sait quel CONTENU RÉEL le Copilot génère.
 *
 * Persistance : les missions vivent dans la table `guides` existante — le
 * mapping vers guides.type (contrainte CHECK migration 019) est ci-dessous.
 * Zéro migration nécessaire.
 */
export type MissionType = 'photos' | 'avis' | 'videos' | 'contenu' | 'strategie' | 'sav'

/** guides.type accepté en base : photos, theme_ux, marketing, products, avis, videos, sav. */
export const MISSION_TO_GUIDE_TYPE: Record<MissionType, string> = {
  photos: 'photos',
  avis: 'avis',
  videos: 'videos',
  contenu: 'theme_ux',
  strategie: 'marketing',
  sav: 'sav',
}

export const GUIDE_TYPE_TO_MISSION: Record<string, MissionType> = {
  photos: 'photos',
  avis: 'avis',
  videos: 'videos',
  theme_ux: 'contenu',
  marketing: 'strategie',
  sav: 'sav',
}

export const MISSION_META: Record<MissionType, { emoji: string; label: string; generates: string }> = {
  photos: { emoji: '📸', label: 'Photos produit', generates: 'Brief photo détaillé par produit (angles, lumière, mise en scène)' },
  avis: { emoji: '⭐', label: 'Avis clients', generates: 'Séquence de 3 emails post-achat prête à copier + réponses aux avis négatifs' },
  videos: { emoji: '🎥', label: 'Vidéos produit', generates: 'Script complet par produit (hook, démo, appel à l’action) — 30-60s' },
  contenu: { emoji: '📝', label: 'Contenu & pages', generates: 'Texte complet prêt à coller dans Shopify (À propos, FAQ, descriptions)' },
  strategie: { emoji: '🏆', label: 'Stratégie', generates: 'Plan d’action priorisé en 3-5 actions concrètes avec échéances' },
  sav: { emoji: '💬', label: 'Service client', generates: 'Bibliothèque de réponses types personnalisées à votre boutique' },
}

/**
 * Classe un problème 👋 Guide dans son type de mission. Heuristique sur les
 * mots du constat — l'agent concurrentiel va toujours en stratégie.
 */
export function missionTypeForProblem(p: Pick<Problem, 'category' | 'title' | 'description' | 'recommendation'>): MissionType {
  if (p.category === 'competitive') return 'strategie'
  const h = `${p.title} ${p.description} ${p.recommendation}`.toLowerCase()
  if (/photo|image|visuel|cliché|shooting/.test(h)) return 'photos'
  if (/avis|review|témoignage|note client|étoile/.test(h)) return 'avis'
  if (/vidéo|video|démonstration filmée/.test(h)) return 'videos'
  if (/sav|service client|réclamation|support|réponse client/.test(h)) return 'sav'
  if (/livraison gratuite|prix|positionnement|concurrent|fidélité|parrainage|programme/.test(h)) return 'strategie'
  // Tout le reste du créatif/éditorial (À propos, FAQ, guides de taille, descriptions…)
  return 'contenu'
}
