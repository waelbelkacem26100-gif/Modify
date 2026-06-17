import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

export function LegalShell({
  title,
  updated,
  updatedLabel = 'Dernière mise à jour',
  children,
}: {
  title: string
  updated?: string
  /** Label devant la date (ex. « Last updated » pour les pages anglaises). */
  updatedLabel?: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-16 sm:pb-24">
        <h1 className="font-syne font-bold text-3xl sm:text-4xl text-text-primary mb-3">{title}</h1>
        {updated && <p className="text-text-muted text-sm mb-10">{updatedLabel} : {updated}</p>}
        <div className="space-y-8">{children}</div>
      </article>
      <Footer />
    </main>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-syne font-semibold text-lg sm:text-xl text-text-primary mb-3">{heading}</h2>
      <div className="space-y-3 text-text-secondary text-sm sm:text-[15px] leading-relaxed">{children}</div>
    </section>
  )
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 list-disc pl-5 marker:text-text-muted">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}
