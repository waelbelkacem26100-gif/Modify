import type { AuditAgent } from './shared'
import { runAgentPrompt } from './shared'

// 🎨 UI/UX & Navigation — analyse du rendu réel de la page d'accueil.
export const uiUxAgent: AuditAgent = {
  key: 'uiux',
  async run(input) {
    const mission =
      `Auditer la page d'accueil et la navigation à partir du HTML réel rendu de la vitrine. Cite les éléments exacts (textes de menu, boutons, sections) que tu observes ou qui manquent.`
    const checklist =
      `- Hiérarchie de la home : bannière principale claire (promesse + bouton), preuve sociale, catégories mises en avant
- Bouton d'achat / d'action visible dès l'arrivée (sans faire défiler)
- Menu : ≤7 entrées, libellés clairs ; barre de recherche visible
- Fil d'Ariane sur les pages produit
- Pied de page complet : contact, livraison, retours, mentions légales, réseaux sociaux
- Cohérence visuelle (si décelable dans le HTML : titres, sections)`
    const data = `HTML RÉEL de la page d'accueil (nettoyé) :\n${input.homeHtml ?? '(vitrine inaccessible — NE RIEN INVENTER sur la home, liste uniquement ce que tu peux déduire des autres données)'}\n\nPRODUITS (pour contexte) : ${input.products.slice(0, 10).map((p) => p.title).join(', ')}`
    return runAgentPrompt('uiux', mission, checklist, data, input)
  },
}
