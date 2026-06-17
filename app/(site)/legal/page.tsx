import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Mentions légales — Modify',
  description: 'Mentions légales du service Modify.',
}

const UPDATED = '4 juin 2026'
const CONTACT = 'contact@modifea.com'

export default function LegalPage() {
  return (
    <LegalShell title="Mentions légales" updated={UPDATED}>
      <LegalSection heading="Éditeur du service">
        <p>
          Le service Modify est édité par <strong>Wael Belkacem</strong>,
          <br />Entrepreneur individuel (auto-entrepreneur),
          <br />2 rue Etienne Dolet, 26100 Romans-sur-Isère, France,
          <br />SIREN/SIRET : en cours d&apos;immatriculation,
          <br />TVA : non applicable (franchise en base de TVA, art. 293 B du CGI).
        </p>
        <p>Contact : <Link href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</Link></p>
      </LegalSection>

      <LegalSection heading="Directeur de la publication">
        <p>Wael Belkacem.</p>
      </LegalSection>

      <LegalSection heading="Hébergement">
        <p>
          L&apos;application est hébergée par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133,
          Walnut, CA 91789, États-Unis — vercel.com.
        </p>
        <p>
          Les données applicatives sont hébergées par <strong>Supabase Inc.</strong> — supabase.com.
        </p>
      </LegalSection>

      <LegalSection heading="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments du service (marque « Modify », code, design, textes) est protégé par le droit
          de la propriété intellectuelle. Toute reproduction non autorisée est interdite.
        </p>
      </LegalSection>

      <LegalSection heading="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans notre{' '}
          <Link href="/privacy" className="text-primary hover:underline">politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Pour toute question : <Link href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</Link>
          {' '}— voir aussi la page <Link href="/contact" className="text-primary hover:underline">Contact</Link>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
