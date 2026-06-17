import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Legal Notice — Modifea',
  description: 'Legal information about Modifea, publisher of the Modify service (French law).',
}

export default function LegalPage() {
  return (
    <LegalShell title="Legal Notice" updated={LEGAL.updated} updatedLabel="Last updated">
      <LegalSection heading="Publisher">
        <p>
          The {LEGAL.service} service is published by <strong>{LEGAL.founder}</strong> ({LEGAL.company}),
          <br />Sole trader (entrepreneur individuel),
          <br />{LEGAL.address},
          <br />SIRET: {LEGAL.siret},
          <br />VAT: not applicable (VAT exemption, art. 293 B of the French General Tax Code).
        </p>
        <p>
          Email:{' '}
          <Link href={`mailto:${LEGAL.founderEmail}`} className="text-primary hover:underline">{LEGAL.founderEmail}</Link>
          {' · '}Website:{' '}
          <a href={LEGAL.site} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{LEGAL.site}</a>
        </p>
      </LegalSection>

      <LegalSection heading="Publication director">
        <p>{LEGAL.founder}.</p>
      </LegalSection>

      <LegalSection heading="Hosting">
        <p>
          The application is hosted by <strong>{LEGAL.host.name}</strong>, {LEGAL.host.address} —{' '}
          <a href={LEGAL.host.site} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vercel.com</a>.
        </p>
        <p>
          Application data is stored by <strong>Supabase Inc.</strong> —{' '}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Intellectual property">
        <p>
          All elements of the service (the &quot;{LEGAL.service}&quot; brand, source code, design and
          text) are protected by intellectual property law. Any unauthorised reproduction or use is
          prohibited.
        </p>
      </LegalSection>

      <LegalSection heading="Personal data">
        <p>
          The processing of personal data is described in our{' '}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and the use
          of cookies in our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          For any question:{' '}
          <Link href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">{LEGAL.contactEmail}</Link>
          {' '}— see also our <Link href="/support" className="text-primary hover:underline">Support</Link> page.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
