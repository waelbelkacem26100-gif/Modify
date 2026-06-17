/**
 * Single source of truth for Modify's pricing. Used by the landing page,
 * subscription page, freemium gates, CTAs and the Stripe checkout.
 *
 * - Gratuit (free): no subscription. 2–3 problems visible, winning-products preview.
 * - Starter (19€/mois): full weekly audit, 5 winning products/week, basic SEO.
 * - Pro (49€/mois): everything automatic — weekly fixes, daily products,
 *   guided agent, weekly SEO articles.
 * - Agency (149€/mois): everything in Pro + multi-store, competitive watch,
 *   trend predictions, price suggestions and priority support.
 *
 * `stripePriceId` is the live Stripe Price the checkout charges against — the
 * billing source of truth. `amountCents`/`priceEur` are kept in sync for display.
 */

export type PlanId = 'free' | 'starter' | 'pro' | 'agency'
export type PaidPlanId = 'starter' | 'pro' | 'agency'

export interface Plan {
  id: PlanId
  name: string
  priceEur: number // monthly price in euros (0 for free)
  amountCents: number // display amount; billing source of truth is stripePriceId
  stripePriceId?: string // live Stripe Price ID (paid plans only)
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
    priceEur: 19,
    amountCents: 1900,
    stripePriceId: 'price_1TjAQCCqFoSohAzu5OvgKZ0Y',
    tagline: 'Pour suivre votre boutique de près',
    features: [
      'Analyse complète chaque semaine',
      '5 produits gagnants par semaine',
      'Référencement Google de base',
      'Tous les problèmes débloqués',
    ],
    cta: 'Choisir Starter',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceEur: 49,
    amountCents: 4900,
    stripePriceId: 'price_1TjARHCqFoSohAzuZP2l0M7V',
    tagline: 'Modify s’occupe de tout, en pilote automatique',
    features: [
      'Tout en automatique, sans rien faire',
      'Correctifs appliqués chaque semaine',
      'Nouveaux produits gagnants chaque jour',
      'Accompagnement par un agent dédié',
      'Articles de blog (SEO) chaque semaine',
    ],
    cta: 'Choisir Pro',
    highlight: true,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    priceEur: 149,
    amountCents: 14900,
    stripePriceId: 'price_1TjAS7CqFoSohAzuK3bH1GBo',
    tagline: 'Pour les agences et boutiques à fort volume',
    features: [
      'Tout le plan Pro, sur plusieurs boutiques',
      'Veille concurrentielle automatique',
      'Prédictions de tendances du marché',
      'Suggestions de prix (jamais appliquées sans vous)',
      'Rapport mensuel détaillé + support prioritaire',
    ],
    cta: 'Choisir Agency',
  },
}

export const TRIAL_DAYS = 14

export function isPaidPlan(id: string | null | undefined): id is PaidPlanId {
  return id === 'starter' || id === 'pro' || id === 'agency'
}

export function planById(id: string | null | undefined): Plan {
  return (id && PLANS[id as PlanId]) || PLANS.starter
}

// Lowest paid price, for "à partir de X€/mois" copy.
export const ENTRY_PRICE_EUR = PLANS.starter.priceEur
