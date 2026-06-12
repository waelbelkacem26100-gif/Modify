import type { AuditAgent } from './shared'
import { runAgentPrompt } from './shared'
import { checklistFor } from '../checks'

// 🛡️ Confiance & Sécurité — réassurance, avis, pages légales, contact.
export const trustAgent: AuditAgent = {
  key: 'trust',
  async run(input) {
    const mission =
      `Auditer tout ce qui rassure (ou inquiète) un acheteur : garanties, avis, pages légales, contact, livraison, FAQ. Tes constats s'appuient sur les pages réelles de la boutique et le HTML rendu. Pour la cohérence légale : compare ce que dit le footer (HTML accueil) et ce qu'annoncent les pages légales (liste fournie).`
    const pagesList = input.pages.length
      ? input.pages.map((p) => `- ${p.title} (/pages/${p.handle}) — ${p.body_words} mots`).join('\n')
      : '(aucune page créée)'
    const faqPage = input.pages.find((p) => /faq|questions/i.test(p.handle + p.title))
    const data = `PAGES RÉELLES de la boutique :
${pagesList}

PAGE FAQ : ${faqPage ? `existe — « ${faqPage.title} » (${faqPage.body_words} mots — si <100 mots, elle est probablement trop maigre pour couvrir livraison/retours/paiement/contact)` : 'AUCUNE page FAQ détectée'}

HTML RÉEL fiche produit (réassurance visible ? livraison annoncée ?) :
${(input.productHtml ?? '').slice(0, 8000) || '(non disponible)'}

HTML RÉEL accueil (footer, contact, badges, infos légales visibles) :
${(input.homeHtml ?? '').slice(-4000) || '(non disponible)'}`
    return runAgentPrompt('trust', mission, checklistFor('trust'), data, input)
  },
}
