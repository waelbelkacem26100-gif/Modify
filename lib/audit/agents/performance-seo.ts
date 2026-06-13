import type { AuditAgent } from './shared'
import { runAgentPrompt, productTable } from './shared'
import { checklistFor } from '../checks'
import { geoBlock } from '../geo'

// ⚡ Performance & SEO + GEO — vitesse mesurée + visibilité Google + lisibilité IA.
export const performanceSeoAgent: AuditAgent = {
  key: 'perf_seo',
  async run(input) {
    const mission =
      `Auditer la vitesse de chargement (mesure réelle Google si disponible), la visibilité sur Google, et le GEO : la boutique est-elle lisible et compréhensible par les IA (ChatGPT, Perplexity) qui recommandent des produits ? Pense comme un acheteur qui demande à ChatGPT "quel produit choisir pour X" : cette boutique a-t-elle le contenu (guides, comparatifs, Q/R) pour être citée ?`
    // v5 — métriques Core Web Vitals complètes, déjà traduites en langage
    // business pour que l'agent les restitue sans jargon.
    const psiBlock = (label: string, ps: NonNullable<typeof input.pagespeed>) => {
      const lcpS = Math.round(ps.lcpMs / 100) / 10
      const lines = [
        `${label} : score ${ps.score}/100 · élément principal affiché en ${lcpS}s${lcpS > 2.5 ? ' (au-delà de 2,5s, les visiteurs impatients partent)' : ''}`,
      ]
      if (ps.cls > 0.1) lines.push(`- Les éléments de la page BOUGENT pendant le chargement (mesure ${ps.cls}) → clics involontaires, surtout sur mobile`)
      if (ps.tbtMs > 300) lines.push(`- La page met du temps à RÉAGIR aux clics (${Math.round(ps.tbtMs / 100) / 10}s de blocage mesuré) → frustration`)
      if (ps.opportunities.length) lines.push(`- Opportunités mesurées : ${ps.opportunities.slice(0, 4).map((o) => `${o.title} (~${Math.round(o.savingsMs / 100) / 10}s)`).join(' · ')}`)
      return lines.join('\n')
    }
    const speedBlock = input.pagespeed
      ? [psiBlock('MESURE RÉELLE GOOGLE — ACCUEIL (mobile)', input.pagespeed),
         input.pagespeedProduct ? psiBlock('MESURE RÉELLE GOOGLE — PAGE PRODUIT (mobile)', input.pagespeedProduct) : null,
        ].filter(Boolean).join('\n\n')
      : `Pas de mesure de vitesse disponible (vitrine inaccessible ou mesure impossible) → NE PAS inventer de problème de vitesse.`
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

GEO SIMULATION v5 — signaux déterministes (mesurés, pas devinés) :
${input.geoSignals ? geoBlock(input.geoSignals, input.products.length) : 'Pages non disponibles → ne pas inventer de problème GEO sans données.'}

PRODUITS (couverture descriptions + textes d'images) :
${productTable(input, 'seo')}

EXTRAIT HTML page produit (balises titre/description visibles au début) :
${(input.productHtml ?? '').slice(0, 3000) || '(non disponible)'}

EXTRAIT HTML home (liens internes pour le maillage) :
${(input.homeHtml ?? '').slice(0, 3000) || '(non disponible)'}`
    return runAgentPrompt('perf_seo', mission, checklistFor('perf_seo'), data, input)
  },
}
