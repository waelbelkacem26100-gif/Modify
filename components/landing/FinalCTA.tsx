import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section className="py-16 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-surface p-8 sm:p-14 text-center">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative">
            <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 sm:mb-5 leading-tight">
              Connectez votre boutique.
              <br />
              <span className="text-gradient">Modify s&apos;occupe du reste.</span>
            </h2>
            <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto mb-8">
              Une connexion. Puis votre boutique monte en conversion, semaine après semaine,
              sans que vous ayez à y penser.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
              >
                Commencer 14 jours gratuits
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 font-medium rounded-xl transition-colors"
              >
                Comment ça marche
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6 text-text-muted text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sans carte bancaire · OAuth Shopify sécurisé · Accès révocable à tout moment
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
