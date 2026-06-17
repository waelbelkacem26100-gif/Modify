import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, LifeBuoy, ShieldCheck, Scale } from 'lucide-react'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Contact — Modify',
  description: 'Contactez l\'équipe Modify : support, confidentialité, questions légales.',
}

const EMAIL = 'contact@modifea.com'

const channels = [
  { icon: LifeBuoy, title: 'Support', desc: 'Aide à l\'installation, questions sur le service, problème technique.', email: EMAIL },
  { icon: ShieldCheck, title: 'Confidentialité & données', desc: 'Exercer vos droits RGPD (accès, suppression…).', email: EMAIL },
  { icon: Scale, title: 'Questions légales', desc: 'Facturation, conditions, partenariats.', email: EMAIL },
]

export default function ContactPage() {
  return (
    <LegalShell title="Contact" updated={undefined}>
      <LegalSection heading="Parlons-en">
        <p>
          Une question sur Modify, votre boutique ou vos données ? Écrivez-nous — nous répondons
          généralement sous 24 à 48 h ouvrées.
        </p>
      </LegalSection>

      <div className="grid sm:grid-cols-3 gap-4">
        {channels.map((c) => (
          <a
            key={c.title}
            href={`mailto:${c.email}`}
            className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors block"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
              <c.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <h3 className="font-syne font-semibold text-text-primary text-sm mb-1">{c.title}</h3>
            <p className="text-text-muted text-xs leading-relaxed mb-3">{c.desc}</p>
            <span className="inline-flex items-center gap-1.5 text-primary text-xs font-medium">
              <Mail className="w-3.5 h-3.5" /> Écrire
            </span>
          </a>
        ))}
      </div>

      <LegalSection heading="Adresse e-mail">
        <p>
          <Link href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</Link>
        </p>
      </LegalSection>

      <LegalSection heading="Liens utiles">
        <p>
          <Link href="/privacy" className="text-primary hover:underline">Confidentialité</Link>
          {' · '}
          <Link href="/terms" className="text-primary hover:underline">CGU</Link>
          {' · '}
          <Link href="/legal" className="text-primary hover:underline">Mentions légales</Link>
        </p>
      </LegalSection>
    </LegalShell>
  )
}
