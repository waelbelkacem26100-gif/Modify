import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, LegalSection, LegalList } from '@/components/legal/LegalShell'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy — Modifea',
  description: 'How Modifea collects, uses and protects your personal data (GDPR).',
}

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={LEGAL.updated} updatedLabel="Last updated">
      <LegalSection heading="1. Controller">
        <p>
          The data controller is {LEGAL.founder}, operating {LEGAL.company} ({LEGAL.service}),
          {' '}{LEGAL.address}. This policy explains what personal data we collect, why, how long we keep it,
          and the rights you have under the EU General Data Protection Regulation (GDPR).
        </p>
      </LegalSection>

      <LegalSection heading="2. Data we collect">
        <LegalList items={[
          <><strong>Account data</strong> — your email address and a user identifier, via our authentication provider (Clerk).</>,
          <><strong>Shopify store data</strong> — your store domain, an OAuth access token, and store content read to run audits and apply fixes (products, themes, orders metadata).</>,
          <><strong>Billing data</strong> — subscription status and customer identifier managed by Stripe. We never store your card number.</>,
          <><strong>Usage &amp; browsing data</strong> — technical logs and limited analytics needed to operate and secure the service.</>,
        ]} />
      </LegalSection>

      <LegalSection heading="3. Purposes of processing">
        <LegalList items={[
          'Provide the service: connect your store, run audits, apply and roll back fixes, report results.',
          'Manage your account, subscription and billing.',
          'Send service and report emails.',
          'Secure the service, prevent abuse and comply with our legal obligations.',
        ]} />
      </LegalSection>

      <LegalSection heading="4. Legal basis">
        <LegalList items={[
          <><strong>Performance of a contract</strong> — to deliver the service you subscribed to.</>,
          <><strong>Legitimate interest</strong> — to secure, maintain and improve the service.</>,
          <><strong>Legal obligation</strong> — to keep accounting and billing records.</>,
          <><strong>Consent</strong> — for any optional analytics cookies (see our Cookie Policy).</>,
        ]} />
      </LegalSection>

      <LegalSection heading="5. Retention">
        <p>
          We keep account and store data for as long as your account is active. After you delete your
          account or disconnect your store, associated data is deleted within a reasonable period, except
          where we must retain billing records to meet legal obligations (typically up to 10 years for
          accounting documents under French law).
        </p>
      </LegalSection>

      <LegalSection heading="6. Sharing with third parties (sub-processors)">
        <p>We share data only with the processors strictly necessary to run the service:</p>
        <LegalList items={[
          <><strong>Shopify</strong> — store connection and data source for audits and fixes.</>,
          <><strong>Stripe</strong> — payment and subscription management.</>,
          <><strong>Clerk</strong> — authentication and account management.</>,
          <><strong>Supabase</strong> — database and storage hosting.</>,
          <><strong>Anthropic</strong> — AI generation of content and recommendations (Claude).</>,
          <><strong>Resend</strong> — transactional and report emails.</>,
          <><strong>Vercel</strong> — application hosting.</>,
        ]} />
        <p>
          Some of these providers may process data outside the EU; in that case, transfers are governed by
          appropriate safeguards such as the EU Standard Contractual Clauses. We do not sell your personal
          data.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>Under the GDPR, you have the right to:</p>
        <LegalList items={[
          'Access the personal data we hold about you.',
          'Rectify inaccurate or incomplete data.',
          'Erase your data (right to be forgotten).',
          'Restrict or object to certain processing.',
          'Data portability — receive your data in a structured, machine-readable format.',
        ]} />
        <p>
          To exercise these rights, contact our Data Protection contact at{' '}
          <Link href={`mailto:${LEGAL.founderEmail}`} className="text-primary hover:underline">{LEGAL.founderEmail}</Link>.
          You may also lodge a complaint with the French supervisory authority (CNIL).
        </p>
      </LegalSection>

      <LegalSection heading="8. Cookies">
        <p>
          {LEGAL.service} uses essential cookies required for authentication and session management, and
          may use optional analytics cookies subject to your consent. Full details are available in our{' '}
          <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="9. Security">
        <p>
          We apply reasonable technical and organisational measures to protect your data, including
          encryption in transit and access controls. No method of transmission or storage is completely
          secure, but we work to protect your information against unauthorised access.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <p>
          For any question relating to your data:{' '}
          <Link href={`mailto:${LEGAL.founderEmail}`} className="text-primary hover:underline">{LEGAL.founderEmail}</Link>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
