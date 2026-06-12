import type { AuditAgent } from './shared'
import { runAgentPrompt } from './shared'
import { checklistFor } from '../checks'

// 📱 Mobile — rendu réel avec user-agent mobile (70%+ du trafic e-commerce).
export const mobileAgent: AuditAgent = {
  key: 'mobile',
  async run(input) {
    const mission =
      `Auditer l'expérience mobile à partir du HTML réellement servi à un iPhone. 7 acheteurs sur 10 sont sur mobile : chaque friction coûte cher.`
    const data = `HTML RÉEL accueil servi à un MOBILE :
${input.homeHtmlMobile ?? '(non disponible — NE RIEN INVENTER sur le mobile)'}

HTML RÉEL fiche produit servie à un MOBILE :
${(input.productHtmlMobile ?? '').slice(0, 8000) || '(non disponible)'}`
    return runAgentPrompt('mobile', mission, checklistFor('mobile'), data, input)
  },
}
