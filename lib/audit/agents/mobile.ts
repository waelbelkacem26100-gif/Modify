import type { AuditAgent } from './shared'
import { runAgentPrompt } from './shared'

// 📱 Mobile — rendu réel avec user-agent mobile (70%+ du trafic e-commerce).
export const mobileAgent: AuditAgent = {
  key: 'mobile',
  async run(input) {
    const mission =
      `Auditer l'expérience mobile à partir du HTML réellement servi à un iPhone. 7 acheteurs sur 10 sont sur mobile : chaque friction coûte cher.`
    const checklist =
      `- Menu mobile (burger) présent et fonctionnel
- Achat rapide : bouton d'achat accessible vite depuis la fiche produit (≤3 gestes)
- Tailles tactiles : boutons et liens assez grands (≥44px — déduis-le des classes/styles si visibles)
- Texte lisible sans zoomer (≥16px — déduis-le si visible)
- Images adaptées au mobile (attributs responsive dans le HTML)
- Balise viewport présente`
    const data = `HTML RÉEL accueil servi à un MOBILE :
${input.homeHtmlMobile ?? '(non disponible — NE RIEN INVENTER sur le mobile)'}

HTML RÉEL fiche produit servie à un MOBILE :
${(input.productHtmlMobile ?? '').slice(0, 8000) || '(non disponible)'}`
    return runAgentPrompt('mobile', mission, checklist, data, input)
  },
}
