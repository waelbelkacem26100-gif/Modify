import type { AuditAgent } from './shared'
import { runAgentPrompt, productTable } from './shared'

// ⚡ Performance & SEO + GEO — vitesse mesurée + visibilité Google + lisibilité IA.
export const performanceSeoAgent: AuditAgent = {
  key: 'perf_seo',
  async run(input) {
    const mission =
      `Auditer la vitesse de chargement (mesure réelle Google si disponible), la visibilité sur Google, et le GEO : la boutique est-elle lisible et compréhensible par les IA (ChatGPT, Perplexity) qui recommandent des produits ?`
    const checklist =
      `- Vitesse : score mesuré, opportunités concrètes (images trop lourdes, trop d'applications)
- Visibilité Google : titres et descriptions Google uniques par page, textes descriptifs des images
- Données structurées produit (prix, stock, avis) présentes dans le HTML → marqueur <!--JSONLD
- GEO (lisibilité IA) : contenu descriptif riche, questions/réponses, politiques claires en texte (livraison, retours)
- Plan du site / maillage interne (si décelable)
- ATTENTION : la LONGUEUR des descriptions produit appartient à l'agent Fiches produits — toi, tu juges uniquement les titres/descriptions GOOGLE (méta) et la lisibilité par les IA, pas le contenu commercial.`
    const ps = input.pagespeed
    const speedBlock = ps
      ? `MESURE RÉELLE GOOGLE (mobile) : score ${ps.score}/100 · premier affichage ${Math.round(ps.fcpMs / 100) / 10}s · affichage complet ${Math.round(ps.lcpMs / 100) / 10}s\nOpportunités mesurées : ${ps.opportunities.map((o) => `${o.title} (~${Math.round(o.savingsMs / 100) / 10}s)`).join(' · ') || 'aucune majeure'}`
      : `Pas de mesure de vitesse disponible → NE PAS inventer de problème de vitesse.`
    const jsonld = input.homeHtml?.includes('<!--JSONLD') || input.productHtml?.includes('<!--JSONLD')
    const data = `${speedBlock}

DONNÉES STRUCTURÉES détectées dans le HTML : ${jsonld ? 'OUI (marqueurs présents)' : 'NON détectées sur home/produit'}

PRODUITS (couverture descriptions + textes d'images) :
${productTable(input, 'seo')}

EXTRAIT HTML page produit (balises titre/description visibles au début) :
${(input.productHtml ?? '').slice(0, 3000) || '(non disponible)'}`
    return runAgentPrompt('perf_seo', mission, checklist, data, input)
  },
}
