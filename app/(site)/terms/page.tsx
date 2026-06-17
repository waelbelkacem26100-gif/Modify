import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, LegalSection, LegalList } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation — Modify',
  description: 'Les conditions d\'utilisation du service Modify pour boutiques Shopify.',
}

const UPDATED = '4 juin 2026'
const CONTACT = 'waelbelkacem26100@gmail.com'

export default function TermsPage() {
  return (
    <LegalShell title="Conditions générales d'utilisation" updated={UPDATED}>
      <LegalSection heading="1. Objet">
        <p>Les présentes conditions (« CGU ») régissent l&apos;accès et l&apos;utilisation du service Modify, qui aide les marchands Shopify à améliorer leur conversion. En créant un compte ou en installant l&apos;application, vous acceptez ces CGU.</p>
      </LegalSection>

      <LegalSection heading="2. Description du service">
        <p>Modify se connecte à votre boutique Shopify via OAuth pour :</p>
        <LegalList items={[
          'Auditer la boutique et chiffrer l\'impact des problèmes détectés en €/mois.',
          'Appliquer automatiquement certaines corrections (descriptions, SEO, alt text, compression d\'images, prix promotionnels réversibles).',
          'Publier du contenu (articles de blog SEO).',
          'Fournir des correctifs de thème via une extension d\'app et un accompagnement guidé.',
          'Mesurer et restituer les résultats en euros.',
        ]} />
      </LegalSection>

      <LegalSection heading="3. Compte et éligibilité">
        <p>Vous devez disposer d&apos;une boutique Shopify et être habilité à la gérer. Vous êtes responsable de la confidentialité de vos identifiants et des activités réalisées via votre compte.</p>
      </LegalSection>

      <LegalSection heading="4. Essai gratuit, abonnement et facturation">
        <LegalList items={[
          'Une offre gratuite est disponible (accès limité). Les offres payantes Starter (19 €/mois), Pro (49 €/mois) et Agency (149 €/mois) incluent un essai gratuit de 14 jours, sans carte bancaire requise pour démarrer.',
          'À l\'issue de l\'essai, l\'abonnement payant choisi (19 €/mois, 49 €/mois ou 149 €/mois) est facturé via Stripe.',
          'L\'abonnement est sans engagement et résiliable à tout moment ; il reste actif jusqu\'à la fin de la période en cours.',
          'Les prix peuvent évoluer ; tout changement vous sera notifié à l\'avance.',
        ]} />
      </LegalSection>

      <LegalSection heading="5. Modifications apportées à votre boutique">
        <p>Vous autorisez Modify à effectuer, en votre nom, les modifications décrites dans le service. Les changements de contenu et de prix sont conçus pour être <strong>réversibles</strong> : Modify conserve les valeurs d&apos;origine et fournit une fonction d&apos;annulation. Les actions sensibles touchant aux prix sont déclenchées avec votre validation. Vous restez responsable du contenu publié sur votre boutique.</p>
      </LegalSection>

      <LegalSection heading="6. Utilisation acceptable">
        <p>Vous vous engagez à ne pas détourner le service, à ne pas tenter d&apos;y accéder de manière non autorisée, et à ne pas l&apos;utiliser pour publier des contenus illégaux ou trompeurs.</p>
      </LegalSection>

      <LegalSection heading="7. Propriété intellectuelle">
        <p>Le service, son code et sa marque restent la propriété de Modify. Le contenu généré pour votre boutique (descriptions, articles, images optimisées) vous appartient et reste sur votre boutique, y compris après résiliation.</p>
      </LegalSection>

      <LegalSection heading="8. Absence de garantie de résultat">
        <p>Modify met en œuvre des moyens pour améliorer votre conversion mais ne garantit aucun résultat chiffré spécifique. Les estimations en euros sont indicatives et dépendent de votre trafic, de votre catalogue et de facteurs externes. Le service est fourni « en l&apos;état ».</p>
      </LegalSection>

      <LegalSection heading="9. Limitation de responsabilité">
        <p>Dans la limite permise par la loi, Modify ne saurait être tenu responsable des dommages indirects, pertes de revenus ou de données résultant de l&apos;utilisation du service. La responsabilité totale de Modify est limitée aux sommes versées au cours des 12 derniers mois.</p>
      </LegalSection>

      <LegalSection heading="10. Suspension et résiliation">
        <p>Vous pouvez résilier à tout moment en désinstallant l&apos;application ou en supprimant votre compte. Nous pouvons suspendre ou résilier l&apos;accès en cas de manquement aux présentes CGU.</p>
      </LegalSection>

      <LegalSection heading="11. Droit applicable">
        <p>Les présentes CGU sont régies par le droit français. Tout litige relève de la compétence des tribunaux français, sous réserve des dispositions légales impératives.</p>
      </LegalSection>

      <LegalSection heading="12. Contact">
        <p>Pour toute question : <Link href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</Link>.</p>
      </LegalSection>
    </LegalShell>
  )
}
