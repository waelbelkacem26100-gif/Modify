import type { AuditAgent } from './shared'
import { runAgentPrompt } from './shared'
import { checklistFor } from '../checks'

// 🎨 UI/UX & Navigation — analyse du rendu réel de la page d'accueil.
export const uiUxAgent: AuditAgent = {
  key: 'uiux',
  async run(input) {
    const mission =
      `Auditer la page d'accueil et la navigation à partir du HTML réel rendu de la vitrine. Cite les éléments exacts (textes de menu, boutons, sections) que tu observes ou qui manquent. La cohérence visuelle se juge en comparant le HTML de la home et celui de la fiche produit fournis.`
    const searchBlock = input.searchTests?.length
      ? input.searchTests.map((t) =>
          `- "${t.query}" → ${t.results} résultat(s)${t.topTitles.length ? ` (${t.topTitles.join(', ')})` : ''}`).join('\n')
      : '(recherche interne non testée — NE PAS inventer de problème de recherche)'
    const aboutPage = input.pages.find((p) => /propos|about|histoire|qui-sommes/i.test(p.handle + p.title))
    const data = `HTML RÉEL de la page d'accueil (nettoyé) :
${input.homeHtml ?? '(vitrine inaccessible — NE RIEN INVENTER sur la home, liste uniquement ce que tu peux déduire des autres données)'}

HTML RÉEL fiche produit (pour juger la cohérence visuelle avec la home) :
${(input.productHtml ?? '').slice(0, 6000) || '(non disponible)'}

RECHERCHE INTERNE réellement testée (requêtes clients typiques) :
${searchBlock}

PAGE "À PROPOS" : ${aboutPage ? `existe — « ${aboutPage.title} » (${aboutPage.body_words} mots)` : 'AUCUNE page À propos/histoire détectée parmi les pages de la boutique'}
PAGES EXISTANTES : ${input.pages.map((p) => p.title).join(', ') || '(aucune)'}

PRODUITS (pour contexte) : ${input.products.slice(0, 10).map((p) => p.title).join(', ')}`
    return runAgentPrompt('uiux', mission, checklistFor('uiux'), data, input)
  },
}
