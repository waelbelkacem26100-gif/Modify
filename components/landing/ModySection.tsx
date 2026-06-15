import ModyAvatar from '@/components/brand/ModyAvatar'

// L2 — Mody, le différenciateur, présenté sur la landing avec ses 4 métiers.
// Identité orange Mody (cohérente avec le dashboard).
const METIERS = [
  { emoji: '🖋️', title: 'Contenu', desc: 'Descriptions, pages, FAQ — textes prêts à coller dans Shopify' },
  { emoji: '⭐', title: 'Réputation', desc: 'Séquences email pour collecter des avis, réponses au SAV prêtes à envoyer' },
  { emoji: '🎬', title: 'Vidéo & Social', desc: 'Scripts vidéo par produit, briefs photo, idées de contenu réseaux' },
  { emoji: '📊', title: 'Stratégie', desc: 'Plans d’action concrets face à vos concurrents' },
]

export default function ModySection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center mb-12">
          <ModyAvatar size={64} glow />
          <h2 className="font-syne font-bold text-3xl sm:text-4xl text-text-primary mt-5 mb-3">
            Mody, votre copilote e-commerce
          </h2>
          <p className="text-text-secondary text-base max-w-2xl">
            Mody analyse vos données en temps réel et vous guide sur tout ce que Modify
            ne peut pas corriger seul — avec du contenu réel, prêt à l’emploi.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METIERS.map((m) => (
            <div key={m.title} className="bg-surface border-l-[3px] border-mody rounded-r-2xl rounded-l-md p-5">
              <div className="text-2xl mb-2">{m.emoji}</div>
              <h3 className="font-syne font-semibold text-text-primary mb-1.5">{m.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
