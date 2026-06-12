import Anthropic from '@anthropic-ai/sdk'
import type { MissionType } from './mission-types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/** Contexte réel transmis au générateur de contenu d'une mission. */
export interface MissionContext {
  shopName: string
  /** Handle admin Shopify (ex: hvzrra-fb) pour les liens directs. */
  storeHandle: string
  niche: string
  /** Problème d'origine (constat exact de l'audit). */
  problemTitle: string
  problemDescription: string
  recommendation: string
  impactEuros: number
  /** Éléments exacts concernés (produits cités par l'audit). */
  affectedItems: string[]
  /** Catalogue : titres + prix réels. */
  products: { title: string; price: string | null }[]
}

export interface MissionStep { title: string; detail: string }
export interface GeneratedMission {
  title: string
  summary: string
  steps: MissionStep[]
}

function adminUrl(handle: string, path: string) {
  return `https://admin.shopify.com/store/${handle}/${path}`
}

/**
 * Ce que le Copilot GÉNÈRE concrètement par type de mission. Chaque étape de la
 * checklist contient le CONTENU RÉEL (texte d'email, script, brief) dans son
 * detail — pas une consigne vague. Le marchand copie-colle et coche.
 */
const GENERATORS: Record<MissionType, (c: MissionContext) => string> = {
  photos: (c) => `Tu es directeur artistique e-commerce. Mission : un BRIEF PHOTO exécutable au smartphone pour la boutique "${c.shopName}" (niche : ${c.niche}).
Problème détecté par l'audit : ${c.problemTitle} — ${c.problemDescription}
Produits concernés (cités par l'audit) : ${c.affectedItems.join(', ') || c.products.slice(0, 6).map((p) => p.title).join(', ')}.

Génère UNE ÉTAPE PAR PRODUIT concerné (max 7). Chaque detail = le brief complet de CE produit : 3-4 prises de vue précises (angle, distance), lumière (où, quand), fond et mise en scène avec des accessoires plausibles pour cette niche, et l'erreur classique à éviter. Termine par une étape "Mettre les photos en ligne" avec le lien ${adminUrl(c.storeHandle, 'products')}.`,

  avis: (c) => `Tu es expert e-réputation e-commerce. Mission : faire décoller la collecte d'avis de "${c.shopName}" (niche : ${c.niche}).
Problème détecté : ${c.problemTitle} — ${c.problemDescription}
Produits phares : ${c.products.slice(0, 6).map((p) => p.title).join(', ')}.

Étapes À GÉNÉRER (le detail contient le CONTENU COMPLET, prêt à copier) :
1. Installer une application d'avis — étapes précises dans l'admin (${adminUrl(c.storeHandle, 'settings/apps')}), recommande Judge.me gratuit
2. Email J+3 après livraison — OBJET + CORPS COMPLET rédigé, personnalisé avec les vrais produits
3. Email de relance J+10 — OBJET + CORPS COMPLET (angle différent : aider les autres acheteurs)
4. Email J+20 avec petit geste — OBJET + CORPS COMPLET (code -10% en remerciement)
5. Modèle de réponse à un avis négatif — TEXTE COMPLET (empathie, solution, invitation en privé)
6. Afficher les avis sur les fiches produit — où et comment dans le thème`,

  videos: (c) => `Tu es expert contenu vidéo e-commerce (Reels/TikTok/Shorts). Mission : premiers scripts vidéo pour "${c.shopName}" (niche : ${c.niche}).
Problème détecté : ${c.problemTitle} — ${c.problemDescription}
Produits concernés : ${c.affectedItems.join(', ') || c.products.slice(0, 3).map((p) => p.title).join(', ')}.

Génère UNE ÉTAPE PAR VIDÉO (3 vidéos max, produits différents). Chaque detail = le SCRIPT COMPLET de 30-60s : hook des 2 premières secondes (texte exact à dire), déroulé seconde par seconde avec les plans/cadrages (smartphone), appel à l'action final (texte exact). Ajoute une dernière étape "Publier" : format, heure de publication conseillée, description du post prête à copier.`,

  contenu: (c) => `Tu es rédacteur e-commerce senior. Mission : créer le contenu manquant de "${c.shopName}" (niche : ${c.niche}).
Problème détecté : ${c.problemTitle} — ${c.problemDescription}
Recommandation de l'audit : ${c.recommendation}
Éléments concernés : ${c.affectedItems.join(', ') || 'voir le problème'}.
Produits (pour personnaliser le texte) : ${c.products.slice(0, 8).map((p) => p.title).join(', ')}.

Génère le CONTENU COMPLET demandé par le problème (texte d'une page À propos, FAQ complète, guide des tailles, description enrichie…) découpé en étapes : chaque detail contient le TEXTE FINAL prêt à coller, suivi d'UNE ligne indiquant OÙ le coller (avec le lien admin exact : pages → ${adminUrl(c.storeHandle, 'pages')}, produits → ${adminUrl(c.storeHandle, 'products')}, thème → ${adminUrl(c.storeHandle, 'themes')}).`,

  strategie: (c) => `Tu es stratège e-commerce. Mission : transformer un constat concurrentiel en plan d'action pour "${c.shopName}" (niche : ${c.niche}).
Constat de l'audit (sourcé) : ${c.problemTitle} — ${c.problemDescription}
Concurrents/faits observés : ${c.affectedItems.join(' · ') || '(voir constat)'}
Recommandation initiale : ${c.recommendation}
Fourchette de prix de la boutique : ${c.products.map((p) => p.price).filter(Boolean).slice(0, 8).join('€, ')}€.

Génère un PLAN D'ACTION de 3 à 5 étapes priorisées. Chaque detail : l'action concrète, pourquoi (face au constat concurrentiel), une échéance suggérée (cette semaine / ce mois-ci), et — si l'action se configure dans Shopify — le lien admin exact (réductions → ${adminUrl(c.storeHandle, 'discounts')}, livraison → ${adminUrl(c.storeHandle, 'settings/shipping')}). Indique pour chaque action si c'est une décision à prendre (👋) ou un réglage que Modify/Shopify rend immédiat (✅).`,

  sav: (c) => `Tu es expert service client e-commerce. Mission : équiper "${c.shopName}" (niche : ${c.niche}) d'un SAV professionnel.
Problème détecté : ${c.problemTitle} — ${c.problemDescription}
Produits (pour personnaliser les réponses) : ${c.products.slice(0, 6).map((p) => p.title).join(', ')}.

Étapes À GÉNÉRER (le detail = le TEXTE COMPLET prêt à copier) :
1. Réponse type — retard de livraison (personnalisée boutique)
2. Réponse type — demande de retour/remboursement
3. Réponse type — produit défectueux ou abîmé
4. Réponse type — question avant achat (taille/compatibilité)
5. Politique de retour claire à publier — TEXTE COMPLET + où le coller (${adminUrl(c.storeHandle, 'pages')})
6. Organiser le suivi : où centraliser les demandes (boîte dédiée, délai de réponse cible)`,
}

/**
 * Génère le contenu réel d'une mission (claude-opus-4-8). Retourne titre,
 * résumé et étapes-checklist dont les details contiennent le contenu final.
 */
export async function generateMissionContent(type: MissionType, ctx: MissionContext): Promise<GeneratedMission> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `${GENERATORS[type](ctx)}

Retourne UNIQUEMENT un JSON valide :
{
  "title": "Titre court de la mission (orienté résultat)",
  "summary": "1-2 phrases : ce que cette mission va rapporter, lié au problème détecté",
  "steps": [
    { "title": "Étape — titre court", "detail": "CONTENU COMPLET prêt à utiliser (texte/script/brief), puis où l'utiliser" }
  ]
}

Règles :
- Tout en français simple, compréhensible en 10 secondes par un marchand non-technique
- Le detail de chaque étape contient le LIVRABLE FINAL (texte intégral, script intégral, brief intégral) — jamais "rédigez un email" sans donner l'email
- Utilise les VRAIS noms de produits fournis, jamais "votre produit"
- 4 à 7 étapes, chacune cochable une fois faite
- Pas d'invention : si une donnée manque (politique de retour réelle, transporteur), écris [À COMPLÉTER : …] plutôt qu'inventer
- Retourne UNIQUEMENT le JSON`,
    }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  const raw = content.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  let parsed: GeneratedMission
  try {
    parsed = JSON.parse(raw) as GeneratedMission
  } catch {
    // Tolérance : du texte peut entourer le JSON — on extrait le dernier objet complet.
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('No JSON object in mission content')
    parsed = JSON.parse(m[0]) as GeneratedMission
  }
  if (!parsed.title || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Mission content incomplete')
  }
  return parsed
}
