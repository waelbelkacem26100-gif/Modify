/**
 * Single source of truth for Modify's pricing. Used by the landing page,
 * subscription page, freemium gates, CTAs and the Stripe checkout.
 *
 * - Gratuit (free): no subscription. 2–3 problems visible, winning-products preview.
 * - Starter (9€/mois): full weekly audit, 5 winning products/week, basic SEO.
 * - Pro (29€/mois): everything automatic — weekly fixes, daily products,
 *   guided agent, weekly SEO articles.
 */

export type PlanId = 'free' | 'starter' | 'pro'
export type PaidPlanId = 'starter' | 'pro'

export interface Plan {
  id: PlanId
  name: string
  priceEur: number // monthly price in euros (0 for free)
  amountCents: number // Stripe unit_amount (0 for free)
  tagline: string
  features: string[]
  cta: string
  highlight?: boolean
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Gratuit',
    priceEur: 0,
    amountCents: 0,
    tagline: 'Découvrez ce que Modify peut faire',
    features: [
      '2 à 3 problèmes détectés visibles',
      'Aperçu des produits gagnants',
      'Impact estimé en €/mois',
    ],
    cta: 'Commencer gratuitement',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceEur: 9,
    amountCents: 900,
    tagline: 'Pour suivre votre boutique de près',
    features: [
      'Analyse complète chaque semaine',
      '5 produits gagnants par semaine',
      'Référencement Google de base',
      'Tous les problèmes débloqués',
    ],
    cta: 'Choisir Starter',
    highlight: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceEur: 29,
    amountCents: 2900,
    tagline: 'Modify s’occupe de tout, en pilote automatique',
    features: [
      'Tout en automatique, sans rien faire',
      'Correctifs appliqués chaque semaine',
      'Nouveaux produits gagnants chaque jour',
      'Accompagnement par un agent dédié',
      'Articles de blog (SEO) chaque semaine',
    ],
    cta: 'Choisir Pro',
  },
}

export const TRIAL_DAYS = 14

export function isPaidPlan(id: string | null | undefined): id is PaidPlanId {
  return id === 'starter' || id === 'pro'
}

export function planById(id: string | null | undefined): Plan {
  return (id && PLANS[id as PlanId]) || PLANS.starter
}

// Lowest paid price, for "à partir de X€/mois" copy.
export const ENTRY_PRICE_EUR = PLANS.starter.priceEur
