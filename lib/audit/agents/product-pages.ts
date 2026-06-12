import type { AuditAgent } from './shared'
import { runAgentPrompt, productTable } from './shared'

// 🛍️ Fiches Produits — analyse PRODUIT PAR PRODUIT (jamais global).
export const productPagesAgent: AuditAgent = {
  key: 'products',
  async run(input) {
    const mission =
      `Auditer chaque fiche produit individuellement. Tes constats citent les produits exacts concernés par leur nom — jamais "certains produits".`
    const checklist =
      `- Titres : longueur idéale 50-70 caractères, mot-clé + bénéfice client (pas juste le nom du modèle)
- Descriptions : >300 mots, bénéfices AVANT caractéristiques, questions/réponses intégrées, absente = critique
- Photos : minimum 3 par produit, textes descriptifs des images présents
- Prix psychologique : 49,90€ plutôt que 50€ ; prix barré pour montrer l'économie
- Variantes : noms clairs pour un client ("Bleu océan / Taille L", pas "Default Title")
- Vidéo de démonstration présente ou non (tu ne peux pas le vérifier ici → ne le liste PAS sauf si une autre donnée le prouve)`
    const data = `PRODUITS (données réelles complètes) :\n${productTable(input)}`
    return runAgentPrompt('products', mission, checklist, data, input)
  },
}
