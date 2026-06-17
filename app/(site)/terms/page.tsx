import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, LegalSection, LegalList } from '@/components/legal/LegalShell'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Terms of Service — Modifea',
  description: 'The terms governing your use of the Modify service operated by Modifea.',
}

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated={LEGAL.updated} updatedLabel="Last updated">
      <LegalSection heading="1. Acceptance of terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of {LEGAL.service}, a
          software-as-a-service application operated by {LEGAL.company} (&quot;{LEGAL.company}&quot;,
          &quot;we&quot;, &quot;us&quot;). By creating an account, installing the application, or otherwise
          using the service, you agree to be bound by these Terms. If you do not agree, do not use the
          service.
        </p>
      </LegalSection>

      <LegalSection heading="2. Description of the service">
        <p>
          {LEGAL.service} is a conversion-rate-optimization (CRO) tool for Shopify stores. It connects to
          your store via Shopify OAuth to:
        </p>
        <LegalList items={[
          'Audit your store and quantify the monthly euro impact of the issues it detects.',
          'Automatically apply certain corrections (product descriptions, SEO metadata, image alt text, image compression, reversible promotional prices).',
          'Publish content such as SEO blog articles.',
          'Provide theme-level fixes through an app extension and guided assistance for what cannot be fixed automatically.',
          'Monitor your store and report measured results in euros.',
        ]} />
        <p>
          The service is provided &quot;as is&quot;. {LEGAL.company} does not guarantee any specific
          financial result; euro estimates are indicative and depend on your traffic, catalogue and
          external factors.
        </p>
      </LegalSection>

      <LegalSection heading="3. Accounts and eligibility">
        <p>
          You must own or be authorised to manage a Shopify store. You are responsible for keeping your
          credentials confidential and for all activity that occurs under your account.
        </p>
      </LegalSection>

      <LegalSection heading="4. Subscription plans">
        <p>The service offers the following plans:</p>
        <LegalList items={[
          'Free — limited access, no payment required.',
          'Starter — €19 / month.',
          'Pro — €49 / month.',
          'Agency — €149 / month.',
        ]} />
        <p>
          Paid plans include a <strong>14-day free trial</strong>, with no credit card required to start.
          At the end of the trial, the selected plan is billed monthly until cancelled.
        </p>
      </LegalSection>

      <LegalSection heading="5. Payment and billing">
        <p>
          Payments are processed securely by <strong>Stripe</strong>. By subscribing to a paid plan, you
          authorise {LEGAL.company} to charge the applicable recurring fee to your payment method through
          Stripe. Prices are stated in euros and exclude any applicable taxes. We may change prices, and
          will notify you in advance of any change affecting your subscription.
        </p>
      </LegalSection>

      <LegalSection heading="6. Cancellation">
        <p>
          Your subscription has no minimum commitment and can be cancelled at any time from the
          subscription page or the Stripe customer portal, or by uninstalling the application. Your access
          remains active until the end of the current billing period, after which it is not renewed. Except
          where required by law, payments already made are non-refundable.
        </p>
      </LegalSection>

      <LegalSection heading="7. Changes to your store">
        <p>
          You authorise {LEGAL.company} to make, on your behalf, the changes described in the service.
          Content and price changes are designed to be <strong>reversible</strong>: {LEGAL.company} keeps
          the original values and provides a one-click rollback. Sensitive price actions are triggered with
          your approval. You remain responsible for the content published on your store.
        </p>
      </LegalSection>

      <LegalSection heading="8. Acceptable use">
        <p>
          You agree not to misuse the service, attempt unauthorised access, reverse-engineer it, or use it
          to publish unlawful or misleading content.
        </p>
      </LegalSection>

      <LegalSection heading="9. Intellectual property">
        <p>
          The service, its source code and its brand remain the property of {LEGAL.company}. Content
          generated for your store (descriptions, articles, optimised images) belongs to you and stays on
          your store, including after termination.
        </p>
      </LegalSection>

      <LegalSection heading="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, {LEGAL.company} shall not be liable for indirect or
          consequential damages, loss of revenue, or loss of data arising from the use of the service.{' '}
          {LEGAL.company}&apos;s total aggregate liability is limited to the amounts you paid during the
          twelve (12) months preceding the event giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection heading="11. Suspension and termination">
        <p>
          You may terminate at any time by cancelling your subscription, uninstalling the application, or
          deleting your account. We may suspend or terminate access in the event of a breach of these
          Terms.
        </p>
      </LegalSection>

      <LegalSection heading="12. Governing law">
        <p>
          These Terms are governed by <strong>French law</strong>. Any dispute falls under the jurisdiction
          of the competent French courts, subject to mandatory legal provisions. See also our{' '}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{' '}
          <Link href="/legal" className="text-primary hover:underline">Legal Notice</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact">
        <p>
          For any question regarding these Terms:{' '}
          <Link href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">{LEGAL.contactEmail}</Link>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
