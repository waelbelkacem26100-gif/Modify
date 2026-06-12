import type { AuditAgent } from './shared'
import { runAgentPrompt } from './shared'
import { checklistFor } from '../checks'

// 🛒 Tunnel de Conversion — panier, checkout express, cross-sell, urgence honnête.
export const funnelAgent: AuditAgent = {
  key: 'funnel',
  async run(input) {
    const mission =
      `Auditer le chemin entre "je veux ce produit" et "j'ai payé" : accueil → collection → fiche produit → panier → paiement. Appuie-toi sur le HTML réel des quatre pages fournies.`
    const data = `HTML RÉEL accueil (chemin vers les produits, pop-up, bandeau bienvenue) :
${(input.homeHtml ?? '').slice(0, 5000) || '(non disponible)'}

HTML RÉEL page collection (filtres, tri, disponibilité) :
${(input.collectionHtml ?? '').slice(0, 5000) || '(non disponible — NE PAS inventer de problème de filtres)'}

HTML RÉEL fiche produit :
${(input.productHtml ?? '').slice(0, 7000) || '(non disponible)'}

HTML RÉEL page panier :
${(input.cartHtml ?? '').slice(0, 5000) || '(non disponible)'}

PRODUITS et prix (pour juger les complémentaires possibles) :
${input.products.slice(0, 15).map((p) => `- ${p.title} (${p.price ?? '?'}€, type: ${p.product_type || '—'})`).join('\n')}`
    return runAgentPrompt('funnel', mission, checklistFor('funnel'), data, input)
  },
}
