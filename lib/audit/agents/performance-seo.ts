import type { AuditAgent } from './shared'
import { runAgentPrompt, productTable } from './shared'
import { checklistFor } from '../checks'

// ⚡ Performance & SEO + GEO — vitesse mesurée + visibilité Google + lisibilité IA.
export const performanceSeoAgent: AuditAgent = {
  key: 'perf_seo',
  async run(input) {
    const mission =
      `Auditer la vitesse de chargement (mesure réelle Google si disponible), la visibilité sur Google, et le GEO : la boutique est-elle lisible et compréhensible par les IA (ChatGPT, Perplexity) qui recommandent des produits ? Pense comme un acheteur qui demande à ChatGPT "quel produit choisir pour X" : cette boutique a-t-elle le contenu (guides, comparatifs, Q/R) pour être citée ?`
    const ps = input.pagespeed
    const speedBlock = ps
      ? `MESURE RÉELLE GOOGLE (mobile) : score ${ps.score}/100 · premier affichage ${Math.round(ps.fcpMs / 100) / 10}s · affichage complet ${Math.round(ps.lcpMs / 100) / 10}s\nOpportunités mesurées : ${ps.opportunities.map((o) => `${o.title} (~${Math.round(o.savingsMs / 100) / 10}s)`).join(' · ') || 'aucune majeure'}`
      : `Pas de mesure de vitesse disponible → NE PAS inventer de problème de vitesse.`
    const jsonld = input.homeHtml?.includes('<!--JSONLD') || input.productHtml?.includes('<!--JSONLD')
    const indexBlock = input.robotsTxt
      ? `robots.txt : ${input.robotsTxt.exists ? (input.robotsTxt.blocksAll ? 'PRÉSENT mais BLOQUE TOUTE L\'INDEXATION (grave)' : 'présent, OK') : 'ABSENT'} · sitemap.xml : ${input.sitemapExists ? 'présent' : 'ABSENT ou invalide'}`
      : 'Indexation non testée → ne pas inventer.'
    const dupBlock = input.duplicateDescriptionPairs
      ? (input.duplicateDescriptionPairs.length
          ? input.duplicateDescriptionPairs.map((p) => `- ${p}`).join('\n')
          : '(aucune paire quasi identique détectée — ne pas inventer de problème de duplication)')
      : '(non testé)'
    const data = `${speedBlock}

INDEXATION réellement testée : ${indexBlock}

DESCRIPTIONS QUASI IDENTIQUES détectées par Modify (comparaison déterministe des textes réels) :
${dupBlock}

DONNÉES STRUCTURÉES détectées dans le HTML : ${jsonld ? 'OUI (marqueurs présents)' : 'NON détectées sur home/produit'}

PRODUITS (couverture descriptions + textes d'images) :
${productTable(input, 'seo')}

EXTRAIT HTML page produit (balises titre/description visibles au début) :
${(input.productHtml ?? '').slice(0, 3000) || '(non disponible)'}

EXTRAIT HTML home (liens internes pour le maillage) :
${(input.homeHtml ?? '').slice(0, 3000) || '(non disponible)'}`
    return runAgentPrompt('perf_seo', mission, checklistFor('perf_seo'), data, input)
  },
}
