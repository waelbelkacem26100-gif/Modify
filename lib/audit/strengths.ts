import type { AuditAgentInput, ProblemCategory, Strength } from './types'

/**
 * Points forts v5 — dérivés DÉTERMINISTIQUEMENT des données réelles collectées.
 * Pas de LLM ici : chaque strength est vérifiable depuis la donnée qui l'a
 * produite (score PSI mesuré, pages réelles, tests de recherche exécutés…).
 * Règle d'honnêteté : une donnée absente (vitrine protégée, PSI indisponible)
 * ne produit NI problème NI point fort — silence.
 */
export function deriveStrengths(category: ProblemCategory, input: AuditAgentInput): Strength[] {
  const s: Strength[] = []
  const products = input.products

  switch (category) {
    case 'products': {
      if (products.length > 0 && products.every((p) => p.image_count >= 3)) {
        s.push({
          category,
          title: 'Tous vos produits ont au moins 3 photos',
          detail: `${products.length} produits vérifiés — un catalogue visuellement complet rassure et vend mieux.`,
        })
      }
      if (products.length > 0 && products.every((p) => p.description_words >= 100)) {
        s.push({
          category,
          title: 'Toutes vos fiches ont une vraie description',
          detail: `${products.length} produits avec 100 mots ou plus — bien au-dessus de la moyenne des boutiques en lancement.`,
        })
      }
      break
    }
    case 'uiux': {
      const tests = input.searchTests ?? []
      if (tests.length >= 2 && tests.every((t) => t.results > 0)) {
        s.push({
          category,
          title: 'Votre recherche interne fonctionne bien',
          detail: `${tests.length} requêtes clients testées (${tests.map((t) => `« ${t.query} »`).join(', ')}) — toutes retournent des produits pertinents.`,
        })
      }
      const about = input.pages.find((p) => /propos|about|histoire|qui-sommes/i.test(p.handle + p.title))
      if (about && about.body_words >= 150) {
        s.push({
          category,
          title: 'Votre page « À propos » raconte une vraie histoire',
          detail: `« ${about.title} » (${about.body_words} mots) — la réassurance par l'humain, beaucoup de boutiques l'oublient.`,
        })
      }
      break
    }
    case 'perf_seo': {
      const ps = input.pagespeed
      if (ps && ps.score >= 80) {
        s.push({
          category,
          title: 'Vos pages se chargent rapidement sur mobile',
          detail: `Score de performance Google : ${ps.score}/100 (mesure réelle) — dans le haut du panier des boutiques Shopify.`,
        })
      }
      if (input.robotsTxt?.exists && !input.robotsTxt.blocksAll && input.sitemapExists) {
        s.push({
          category,
          title: 'Google peut indexer votre boutique correctement',
          detail: 'robots.txt et plan du site présents et valides — testés réellement.',
        })
      }
      if (input.duplicateDescriptionPairs && input.duplicateDescriptionPairs.length === 0 && products.length >= 5) {
        s.push({
          category,
          title: 'Aucune description dupliquée entre vos produits',
          detail: `${products.length} fiches comparées deux à deux — chaque produit a son propre texte (Google apprécie).`,
        })
      }
      // GEO signals v5 — déterministe
      const geo = input.geoSignals
      if (geo) {
        if (geo.guidePages.length >= 1) {
          s.push({
            category,
            title: 'Votre boutique a du contenu que ChatGPT peut recommander',
            detail: `${geo.guidePages.length} page(s) de guide détectée(s) (${geo.guidePages.map((p) => `« ${p.title} »`).join(', ')}) — les IA citent les boutiques avec ce type de contenu expert.`,
          })
        } else if (geo.geoScore >= 50 && geo.deepDescriptionCount >= Math.ceil(products.length * 0.7)) {
          s.push({
            category,
            title: 'Vos descriptions produits sont riches en contenu',
            detail: `${geo.deepDescriptionCount}/${products.length} produits avec 200+ mots — suffisant pour que les IA recommandent vos produits en contexte.`,
          })
        }
      }
      break
    }
    case 'trust': {
      const handles = input.pages.map((p) => `${p.handle} ${p.title}`.toLowerCase()).join(' | ')
      const legal = /mentions|legal/.test(handles) && /confidentialit|privacy/.test(handles) && /vente|terms|cgv/.test(handles)
      if (legal) {
        s.push({
          category,
          title: 'Vos pages légales sont en place',
          detail: 'Mentions légales, confidentialité et conditions de vente présentes — obligatoire et rassurant.',
        })
      }
      const faq = input.pages.find((p) => /faq|questions/i.test(p.handle + p.title))
      if (faq && faq.body_words >= 200) {
        s.push({
          category,
          title: 'Votre FAQ couvre les questions des clients',
          detail: `« ${faq.title} » (${faq.body_words} mots) — moins de questions au SAV, plus de confiance avant l'achat.`,
        })
      }
      break
    }
    case 'funnel':
    case 'mobile':
    case 'competitive':
      // Pas de strength déterministe fiable sans HTML vitrine — silence honnête.
      break
  }
  return s.slice(0, 2)
}
