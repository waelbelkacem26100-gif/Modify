/**
 * Preview publique TEMPORAIRE (v7) — montre le dashboard avec les vraies données
 * AquaDrive sans authentification Clerk, derrière un token statique.
 *
 * LECTURE SEULE : seules les routes GET de données acceptent ce bypass ; aucune
 * mutation (lancer audit, appliquer correctif, chat Mody) n'est exposée.
 *
 * ⚠️ À RETIRER après la démo : supprimer app/preview/, ce fichier, et les blocs
 * « preview bypass » des routes GET (audit/strengths, proofs, copilot/missions).
 */

export const PREVIEW_TOKEN = 'modify-preview-2026'

/** user_id admin (propriétaire) — la boutique AquaDrive y est rattachée. */
export const PREVIEW_ADMIN_USER_ID = 'user_3EY7Xb5pBY6UUFxJU4cZCclp0Qv'

/**
 * Côté client : sur la route /preview, ajoute ?token=… aux appels API pour que
 * les routes GET résolvent l'utilisateur admin. Ailleurs, ne touche à rien (donc
 * aucun impact sur le dashboard authentifié réel).
 */
export function withPreviewToken(url: string): string {
  if (typeof window === 'undefined') return url
  if (!window.location.pathname.startsWith('/preview')) return url
  const token = new URLSearchParams(window.location.search).get('token')
  if (!token) return url
  return url + (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`
}
