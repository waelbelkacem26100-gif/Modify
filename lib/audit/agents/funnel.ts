import type { AuditAgent } from './shared'
import { runAgentPrompt } from './shared'

// 🛒 Tunnel de Conversion — panier, checkout express, cross-sell, urgence honnête.
export const funnelAgent: AuditAgent = {
  key: 'funnel',
  async run(input) {
    const mission =
      `Auditer le chemin entre "je veux ce produit" et "j'ai payé" : fiche produit → panier → paiement. Appuie-toi sur le HTML réel des pages produit et panier.`
    const checklist =
      `- Panier : produits complémentaires suggérés, frais de livraison annoncés AVANT le paiement, messages de réassurance
- Paiement express visible (Shop Pay, Apple Pay, Google Pay) — cherche les marqueurs de boutons de paiement dans le HTML
- Produits complémentaires sur la fiche produit ("souvent achetés ensemble")
- Urgence HONNÊTE uniquement (vrai stock faible) — jamais de faux compteur
- Champ code promo visible
- Récupération de panier abandonné (tu ne peux pas le vérifier ici → ne le liste PAS)`
    const data = `HTML RÉEL fiche produit :
${(input.productHtml ?? '').slice(0, 8000) || '(non disponible)'}

HTML RÉEL page panier :
${(input.cartHtml ?? '').slice(0, 6000) || '(non disponible)'}

PRODUITS et prix (pour juger les complémentaires possibles) :
${input.products.slice(0, 15).map((p) => `- ${p.title} (${p.price ?? '?'}€, type: ${p.product_type || '—'})`).join('\n')}`
    return runAgentPrompt('funnel', mission, checklist, data, input)
  },
}
