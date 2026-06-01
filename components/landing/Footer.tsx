import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="font-syne font-bold text-text-primary">Modify</span>
        </Link>

        <p className="text-text-muted text-sm">
          © {new Date().getFullYear()} Modify. Tous droits réservés.
        </p>

        <div className="flex items-center gap-6 text-sm text-text-muted">
          <Link href="#" className="hover:text-text-secondary transition-colors">Confidentialité</Link>
          <Link href="#" className="hover:text-text-secondary transition-colors">CGU</Link>
          <Link href="mailto:support@modify.io" className="hover:text-text-secondary transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
