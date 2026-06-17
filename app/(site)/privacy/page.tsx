import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, LegalSection, LegalList } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Modify',
  description: 'Comment Modify collecte, utilise et protège les données de votre boutique Shopify.',
}

const UPDATED = '4 juin 2026'
const CONTACT = 'contact@modifea.com'

export default function PrivacyPage() {
  return (
    <LegalShell title="Politique de confidentialité" updated={UPDATED}>
      <LegalSection heading="1. Qui sommes-nous">
        <p>
          Modify (« Modify », « nous ») est un service en ligne (SaaS) qui aide les marchands Shopify à
          améliorer leur taux de conversion. Cette politique explique quelles données nous traitons,
          pourquoi, et quels sont vos droits. Elle s&apos;applique au site modify-coral.vercel.app et à
          l&apos;application Modify installée sur votre boutique Shopify.
        </p>
      </LegalSection>

      <LegalSection heading="2. Données que nous collectons">
        <p>Lorsque vous connectez votre boutique via OAuth Shopify, nous accédons aux données nécessaires au service :</p>
        <LegalList items={[
          <><strong>Données boutique & thème</strong> : nom de domaine, thèmes, fichiers de thème, réglages.</>,
          <><strong>Catalogue produits</strong> : titres, descriptions, images, variantes, prix, tags, types.</>,
          <><strong>Commandes (métadonnées)</strong> : montants et dates agrégés, et identifiants produits vendus — utilisés pour mesurer la conversion et détecter les invendus. Nous ne stockons pas les données personnelles de vos clients.</>,
          <><strong>Contenu</strong> : articles de blog et pages générés par le service.</>,
          <><strong>Compte</strong> : votre adresse e-mail et identifiant, via notre prestataire d&apos;authentification (Clerk).</>,
          <><strong>Facturation</strong> : gérée par Stripe ; nous ne stockons jamais vos données de carte bancaire.</>,
          <><strong>Données d&apos;usage</strong> : journaux techniques des actions effectuées (audits, correctifs, optimisations) à des fins de fiabilité.</>,
        ]} />
      </LegalSection>

      <LegalSection heading="3. Périmètre d&apos;accès Shopify (scopes)">
        <p>Nous demandons uniquement les autorisations nécessaires au fonctionnement :</p>
        <LegalList items={[
          <><code>read_products</code>, <code>write_products</code> : auditer et corriger les fiches produits, images et prix.</>,
          <><code>read_themes</code>, <code>write_themes</code> : analyser le thème et préparer les correctifs.</>,
          <><code>read_content</code>, <code>write_content</code> : publier les articles de blog SEO.</>,
          <><code>read_analytics</code>, <code>read_orders</code> : mesurer la conversion et le revenu récupéré.</>,
        ]} />
        <p>Vous pouvez révoquer ces accès à tout moment en désinstallant l&apos;application depuis votre admin Shopify.</p>
      </LegalSection>

      <LegalSection heading="4. Pourquoi nous traitons ces données">
        <p>Nous traitons vos données exclusivement pour fournir le service : auditer la boutique, générer et appliquer des correctifs, produire du contenu SEO, compresser les images, mesurer les résultats en euros et vous envoyer des rapports. La base légale est l&apos;exécution du contrat qui nous lie (CGU) et notre intérêt légitime à assurer et améliorer le service.</p>
      </LegalSection>

      <LegalSection heading="5. Sous-traitants et partage">
        <p>Nous ne vendons jamais vos données. Nous faisons appel à des sous-traitants techniques qui les traitent pour notre compte :</p>
        <LegalList items={[
          <><strong>Shopify</strong> — plateforme source de votre boutique.</>,
          <><strong>Supabase</strong> — base de données et hébergement des enregistrements applicatifs.</>,
          <><strong>Clerk</strong> — authentification et gestion de compte.</>,
          <><strong>Anthropic (Claude)</strong> — génération de contenu (descriptions, articles, recommandations).</>,
          <><strong>Stripe</strong> — paiement et abonnement.</>,
          <><strong>Resend</strong> — envoi des e-mails de rapport.</>,
          <><strong>Google PageSpeed Insights</strong> — mesure de la vitesse (URL publique de la boutique).</>,
          <><strong>Vercel</strong> — hébergement de l&apos;application.</>,
        ]} />
      </LegalSection>

      <LegalSection heading="6. Transferts internationaux">
        <p>Certains sous-traitants sont situés en dehors de l&apos;Union européenne (notamment aux États-Unis). Ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types ou mécanismes équivalents).</p>
      </LegalSection>

      <LegalSection heading="7. Conservation des données">
        <p>Nous conservons vos données tant que votre compte est actif. À la désinstallation de l&apos;application ou à la suppression de votre compte, les données associées sont supprimées sous 30 jours, sauf obligation légale de conservation (facturation). Les modifications appliquées à votre boutique restent votre propriété et demeurent sur Shopify.</p>
      </LegalSection>

      <LegalSection heading="8. Sécurité">
        <p>Les échanges sont chiffrés en transit (HTTPS). Les jetons d&apos;accès Shopify sont stockés de façon restreinte et utilisés uniquement côté serveur. L&apos;accès aux données est protégé par des règles de sécurité au niveau de la base (RLS).</p>
      </LegalSection>

      <LegalSection heading="9. Vos droits">
        <p>Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Pour les exercer, écrivez-nous à <Link href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</Link>. Vous pouvez aussi introduire une réclamation auprès de la CNIL.</p>
      </LegalSection>

      <LegalSection heading="10. Données des clients du marchand (RGPD Shopify)">
        <p>Modify n&apos;a pas vocation à traiter les données personnelles des clients de votre boutique. Conformément aux exigences Shopify, nous répondons aux webhooks de conformité (<code>customers/redact</code>, <code>shop/redact</code>, <code>customers/data_request</code>) en supprimant ou restituant les données concernées.</p>
      </LegalSection>

      <LegalSection heading="11. Cookies">
        <p>Le site utilise des cookies strictement nécessaires à l&apos;authentification et au fonctionnement. Aucun cookie publicitaire tiers n&apos;est déposé.</p>
      </LegalSection>

      <LegalSection heading="12. Modifications">
        <p>Nous pouvons mettre à jour cette politique. La date de dernière mise à jour figure en haut de page. En cas de changement substantiel, nous vous en informerons.</p>
      </LegalSection>

      <LegalSection heading="13. Contact">
        <p>Pour toute question relative à vos données : <Link href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</Link>.</p>
      </LegalSection>
    </LegalShell>
  )
}
