import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Clock, Plug, XCircle, RotateCcw } from 'lucide-react'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Support — Modifea',
  description: 'Get help with Modify: connect your store, manage your subscription, roll back changes.',
}

const faqs = [
  {
    icon: Plug,
    q: 'How do I connect my Shopify store?',
    a: 'From your dashboard, click “Connect my store”, enter your .myshopify.com domain and approve the secure Shopify authorization. The audit starts automatically once connected.',
  },
  {
    icon: XCircle,
    q: 'How do I cancel my subscription?',
    a: 'Open “My subscription” and use the Stripe customer portal to cancel in one click. Your access stays active until the end of the current billing period — no minimum commitment.',
  },
  {
    icon: RotateCcw,
    q: 'How do I roll back a change?',
    a: 'Every automatic fix is backed up before it is applied. On the Corrections page, open the fix and click “Undo” to restore the original values on your store in one click.',
  },
]

export default function SupportPage() {
  return (
    <LegalShell title="Support" updatedLabel="Last updated">
      <LegalSection heading="We’re here to help">
        <p>
          A question about {LEGAL.service}, your store or your data? Email us at{' '}
          <Link href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">{LEGAL.contactEmail}</Link>
          {' '}— we typically reply within <strong>24–48 business hours</strong>.
        </p>
      </LegalSection>

      {/* Contact cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <a
          href={`mailto:${LEGAL.contactEmail}`}
          className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors block"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
            <Mail className="w-[18px] h-[18px] text-primary" />
          </div>
          <h3 className="font-syne font-semibold text-text-primary text-sm mb-1">Email support</h3>
          <p className="text-text-muted text-xs leading-relaxed mb-3">
            Installation help, questions about the service, technical issues, billing.
          </p>
          <span className="inline-flex items-center gap-1.5 text-primary text-xs font-medium">
            <Mail className="w-3.5 h-3.5" /> {LEGAL.contactEmail}
          </span>
        </a>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
            <Clock className="w-[18px] h-[18px] text-primary" />
          </div>
          <h3 className="font-syne font-semibold text-text-primary text-sm mb-1">Response time</h3>
          <p className="text-text-muted text-xs leading-relaxed">
            We aim to answer every request within <strong className="text-text-secondary">24 to 48 business hours</strong>.
          </p>
        </div>
      </div>

      {/* Quick FAQ */}
      <LegalSection heading="Quick FAQ">
        <div className="space-y-3 not-prose">
          {faqs.map((f) => (
            <div key={f.q} className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-text-primary text-sm mb-1">{f.q}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection heading="Useful links">
        <p>
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
          {' · '}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          {' · '}
          <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
          {' · '}
          <Link href="/legal" className="text-primary hover:underline">Legal Notice</Link>
        </p>
      </LegalSection>
    </LegalShell>
  )
}
