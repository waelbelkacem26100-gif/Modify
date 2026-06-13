import { Star } from 'lucide-react'

/**
 * Explique une correction "données structurées" (JSON-LD/GEO) SANS mockup
 * technique : une phrase claire + un mini rich-snippet simulé qui montre ce
 * que Google peut désormais afficher. Jamais de visuel s'il n'y a aucun
 * changement réel.
 */
interface Props {
  before: boolean
  after: boolean
  fieldsAdded: string[]
}

function RichSnippetMini({ fields }: { fields: string[] }) {
  const showPrice = fields.some((f) => /prix/i.test(f))
  const showStars = fields.some((f) => /note|avis/i.test(f))
  return (
    <div className="bg-[#F1F3F4] rounded-xl p-4 border border-border/40 max-w-sm">
      <p className="text-[#1A0DAB] text-sm font-medium">Votre produit — Votre boutique</p>
      <div className="flex items-center gap-2 mt-1 text-xs">
        {showStars && (
          <span className="flex items-center gap-0.5 text-[#E7711B]">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
          </span>
        )}
        {showPrice && <span className="text-[#4D5156] font-medium">149,90 €</span>}
        <span className="text-[#188038]">En stock</span>
      </div>
      <p className="text-[#4D5156] text-[12px] mt-1">Aperçu du type d’affichage enrichi désormais possible</p>
    </div>
  )
}

export default function StructuredDataExplainer({ before, after, fieldsAdded }: Props) {
  if (before === after) return null // aucun changement réel → rien à montrer
  const list = fieldsAdded.join(', ')
  return (
    <div className="space-y-3">
      {!before && after ? (
        <p className="text-text-secondary text-sm leading-relaxed">
          <span className="text-text-muted font-medium">Avant : </span>
          Google ne pouvait afficher que le titre de votre page dans les résultats de recherche.{' '}
          <span className="text-text-primary font-medium">Maintenant : </span>
          Google peut aussi afficher <span className="text-primary font-medium">{list}</span> directement, comme ceci :
        </p>
      ) : (
        <p className="text-text-secondary text-sm leading-relaxed">
          Vos données produits étaient déjà visibles par Google. Modify a ajouté : <span className="text-primary font-medium">{list}</span>.
        </p>
      )}
      {!before && after && <RichSnippetMini fields={fieldsAdded} />}
    </div>
  )
}
