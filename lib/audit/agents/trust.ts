import type { AuditAgent } from './shared'
import { runAgentPrompt } from './shared'

// 🛡️ Confiance & Sécurité — réassurance, avis, pages légales, contact.
export const trustAgent: AuditAgent = {
  key: 'trust',
  async run(input) {
    const mission =
      `Auditer tout ce qui rassure (ou inquiète) un acheteur : garanties, avis, pages légales, contact. Tes constats s'appuient sur les pages réelles de la boutique et le HTML rendu.`
    const checklist =
      `- Badges de paiement / sécurité visibles sur la fiche produit
- Garanties et retours mentionnés sur la fiche produit (pas seulement en page séparée)
- Avis clients réels affichés (note, nombre) — si AUCUN avis n'existe, le problème est "collecter des avis" (guide), jamais en inventer
- Page contact avec de vrais moyens (email, formulaire, téléphone)
- Mentions légales + conditions de vente + politique de confidentialité présentes
- Bandeau cookies / consentement (si décelable dans le HTML)
- https partout (les liens du HTML)`
    const pagesList = input.pages.length
      ? input.pages.map((p) => `- ${p.title} (/pages/${p.handle}) — ${p.body_words} mots`).join('\n')
      : '(aucune page créée)'
    const data = `PAGES RÉELLES de la boutique :
${pagesList}

HTML RÉEL fiche produit (réassurance visible ?) :
${(input.productHtml ?? '').slice(0, 8000) || '(non disponible)'}

HTML RÉEL accueil (footer, contact, badges) :
${(input.homeHtml ?? '').slice(-4000) || '(non disponible)'}`
    return runAgentPrompt('trust', mission, checklist, data, input)
  },
}
