'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const QA = [
  {
    q: 'Modify peut-il casser ma boutique ?',
    a: 'Non. Avant chaque modification, Modify crée une sauvegarde des valeurs exactes qui vont changer, applique, puis relit Shopify pour vérifier que le changement est bien en ligne. Un bouton « Annuler » restaure l’état d’origine à tout moment. Rien n’est marqué « Corrigé » sans vérification réelle.',
  },
  {
    q: 'Qu’est-ce que Modify corrige tout seul, et qu’est-ce qui reste à faire ?',
    a: 'Modify s’occupe automatiquement des titres et descriptions Google, des textes descriptifs d’images, des descriptions produit, des badges de confiance, des produits complémentaires et de la lisibilité par les IA (ChatGPT, Perplexity). Pour ce qu’il ne peut pas faire à votre place — vraies photos, vidéos, collecte d’avis — il vous donne un guide pas à pas personnalisé avec votre coach.',
  },
  {
    q: 'Les chiffres en € sont-ils fiables ?',
    a: 'Ce sont des estimations honnêtes, calibrées sur le chiffre d’affaires réel de votre boutique (jamais gonflées). Chaque problème cite les produits ou pages exacts concernés — vous pouvez tout vérifier. Si une donnée manque, Modify le dit plutôt que d’inventer.',
  },
  {
    q: 'Combien ça coûte ?',
    a: 'Gratuit pour découvrir (analyse + 3 problèmes visibles). Starter à 19€/mois pour l’analyse complète chaque semaine. Pro à 49€/mois pour tout en automatique : corrections hebdomadaires, articles de blog, coach dédié. Agency à 149€/mois pour plusieurs boutiques, veille concurrentielle et suggestions de prix. Essai de 14 jours, sans engagement.',
  },
]

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h2 className="font-syne text-3xl sm:text-4xl font-bold text-text-primary text-center mb-8 sm:mb-12">
          Questions fréquentes
        </h2>
        <div className="space-y-3">
          {QA.map((item, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-surface-2 transition-colors duration-150"
              >
                <span className="font-medium text-text-primary text-sm sm:text-base">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && (
                <p className="px-5 pb-5 text-text-secondary text-sm leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
