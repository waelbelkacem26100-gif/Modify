import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-center md:text-left">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="font-syne font-bold text-text-primary">Modify</span>
        </Link>

        <p className="text-text-muted text-sm">
          © {new Date().getFullYear()} Modify. Tous droits réservés.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-muted">
          <Link href="/privacy" className="hover:text-text-secondary transition-colors">Confidentialité</Link>
          <Link href="/terms" className="hover:text-text-secondary transition-colors">CGU</Link>
          <Link href="/legal" className="hover:text-text-secondary transition-colors">Mentions légales</Link>
          <Link href="/contact" className="hover:text-text-secondary transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
