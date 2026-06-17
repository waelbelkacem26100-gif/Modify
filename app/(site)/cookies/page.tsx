import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, LegalSection, LegalList } from '@/components/legal/LegalShell'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Cookie Policy — Modifea',
  description: 'Which cookies Modifea uses, why, and how to manage them.',
}

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" updated={LEGAL.updated} updatedLabel="Last updated">
      <LegalSection heading="What cookies are">
        <p>
          Cookies are small files stored on your device when you visit a website. {LEGAL.company} uses
          cookies and similar technologies to keep you signed in, secure your session, and understand how
          the service is used. This policy explains which cookies we use and how to control them.
        </p>
      </LegalSection>

      <LegalSection heading="Essential cookies">
        <p>
          These are required for the service to work and cannot be switched off. They do not require your
          consent.
        </p>
        <LegalList items={[
          <><strong>Authentication (Clerk)</strong> — keeps you signed in and protects your account.</>,
          <><strong>Session &amp; security</strong> — maintains your session and protects against CSRF and abuse (e.g. the Shopify OAuth state cookie).</>,
          <><strong>Preferences</strong> — remembers your light/dark theme choice.</>,
        ]} />
      </LegalSection>

      <LegalSection heading="Analytics cookies (optional)">
        <p>
          Where used, analytics cookies help us measure aggregate usage to improve the service. They are
          optional and are only set with your consent. You can decline them without affecting essential
          functionality.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party cookies">
        <p>
          Some features rely on third parties that may set their own cookies:
        </p>
        <LegalList items={[
          <><strong>Stripe</strong> — payment processing and fraud prevention during checkout and billing.</>,
          <><strong>Clerk</strong> — authentication, as described above.</>,
        ]} />
      </LegalSection>

      <LegalSection heading="No advertising cookies">
        <p>
          {LEGAL.company} does <strong>not</strong> use advertising or cross-site tracking cookies, and
          does not sell your data to advertisers.
        </p>
      </LegalSection>

      <LegalSection heading="How to manage or refuse cookies">
        <LegalList items={[
          'You can accept or decline optional cookies via the consent banner, where applicable.',
          'You can delete or block cookies through your browser settings at any time.',
          'Blocking essential cookies may prevent you from signing in or using parts of the service.',
        ]} />
      </LegalSection>

      <LegalSection heading="More information">
        <p>
          See our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for
          how we process personal data. Questions?{' '}
          <Link href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">{LEGAL.contactEmail}</Link>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
