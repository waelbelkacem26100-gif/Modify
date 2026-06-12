import type { AuditAgent } from './shared'
import { runAgentPrompt, productTable } from './shared'
import { checklistFor } from '../checks'

// 🛍️ Fiches Produits — analyse PRODUIT PAR PRODUIT (jamais global).
export const productPagesAgent: AuditAgent = {
  key: 'products',
  async run(input) {
    const mission =
      `Auditer chaque fiche produit individuellement. Tes constats citent les produits exacts concernés par leur nom — jamais "certains produits". Les extraits de description fournis te permettent de juger le ton, les mots risqués et la structure : appuie-toi dessus, et seulement dessus.`
    const excerpts = input.products
      .filter((p) => p.description_excerpt)
      .slice(0, 20)
      .map((p) => `« ${p.title} » : "${p.description_excerpt}"`)
      .join('\n')
    const data = `PRODUITS (données réelles complètes) :
${productTable(input)}

EXTRAITS DE DESCRIPTIONS (50 premiers mots, texte réel) — pour ton, mots risqués, structure, cohérence :
${excerpts || '(aucune description à analyser)'}`
    return runAgentPrompt('products', mission, checklistFor('products'), data, input)
  },
}
