/**
 * Mockup "résultat Google" avant/après pour les corrections de titres et
 * descriptions Google. Exception volontaire au dark mode : la carte imite un
 * vrai résultat de recherche (fond clair) pour un réalisme immédiat.
 */
interface Side { title: string; description: string; url: string }

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s
}

function GoogleCard({ side, label, accent }: { side: Side; label: string; accent?: boolean }) {
  const empty = !side.title?.trim()
  return (
    <div className="flex-1 min-w-0">
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${accent ? 'text-primary' : 'text-text-muted'}`}>{label}</p>
      <div className="bg-[#F1F3F4] rounded-xl p-4 border border-border/40">
        {empty ? (
          <p className="text-[#4D5156] text-xs italic leading-relaxed">
            Aucun titre personnalisé — Google génère un titre automatique (souvent peu engageant)
          </p>
        ) : (
          <>
            <p className="text-[#006621] text-xs truncate mb-0.5">{truncate(side.url, 60)}</p>
            <p className="text-[#1A0DAB] text-[15px] leading-snug font-medium hover:underline cursor-default">
              {truncate(side.title, 70)}
            </p>
            <p className="text-[#4D5156] text-[13px] leading-snug mt-1">
              {side.description?.trim()
                ? truncate(side.description, 160)
                : <span className="italic">Aucune description — Google pioche un extrait de page au hasard</span>}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function GooglePreviewBeforeAfter({ before, after }: { before: Side; after: Side }) {
  // Aucun changement réel → pas de fausse comparaison.
  if (before.title === after.title && before.description === after.description) {
    return <p className="text-text-secondary text-sm">Cette information était déjà optimisée.</p>
  }
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <GoogleCard side={before} label="Avant" />
      <GoogleCard side={after} label="Après" accent />
    </div>
  )
}
