import type { ProblemCategory } from './types'

/**
 * SOURCE UNIQUE des points de contrôle de l'audit v3.
 *
 * Chaque entrée est un check réellement soumis à l'agent de sa catégorie —
 * le "score de précision Modify" affiché sur la page Analyse est la somme
 * exacte de ces listes (jamais un chiffre marketing inventé). Si tu ajoutes
 * un check ici, il est automatiquement compté ET injecté dans le prompt.
 */
export const AUDIT_CHECKS: Record<ProblemCategory, string[]> = {
  products: [
    'Titres : longueur idéale 50-70 caractères, mot-clé + bénéfice client (pas juste le nom du modèle)',
    'Descriptions : >300 mots, bénéfices AVANT caractéristiques, questions/réponses intégrées, absente = critique',
    'Photos : minimum 3 par produit, textes descriptifs des images présents',
    'Prix psychologique : 49,90€ plutôt que 50€ ; prix barré pour montrer l\'économie',
    'Variantes : noms clairs pour un client ("Bleu océan / Taille L", pas "Default Title")',
    'Guide des tailles / compatibilité : pour des produits techniques, une aide au choix manque-t-elle ? (déduis-le des types de produits)',
    'Cohérence du ton entre les descriptions (extraits fournis) : un style qui change du tout au tout d\'une fiche à l\'autre casse la confiance',
    'Mots risqués dans les extraits : allégations santé invérifiables, superlatifs juridiquement risqués ("le meilleur du monde", "garanti à vie" sans garantie réelle)',
    'Structure des descriptions : listes à puces, questions/réponses, tableau de caractéristiques — si l\'extrait ne permet pas de juger, ne l\'affirme pas',
    'Prix incohérents entre produits très proches (cannibalisation : deux variantes similaires à prix illogiques)',
    'Tags et catégorisation : produits sans tags ou mal classés pour la navigation et la recherche interne',
  ],
  uiux: [
    'Hiérarchie de la home : bannière principale claire (promesse + bouton), preuve sociale, catégories mises en avant',
    'Bouton d\'achat / d\'action visible dès l\'arrivée (sans faire défiler)',
    'Menu : ≤7 entrées, libellés clairs ; barre de recherche visible',
    'Fil d\'Ariane sur les pages produit',
    'Pied de page complet : contact, livraison, retours, mentions légales, réseaux sociaux, inscription newsletter',
    'Bandeau d\'avantages (livraison offerte, garantie) en haut de page',
    'Contraste et visibilité du bouton d\'achat principal (si décelable dans le HTML)',
    'Cohérence visuelle entre la home et la fiche produit (mêmes codes : titres, boutons, ambiance) — HTML des deux fourni',
    'Page "À propos" : existe-t-elle, raconte-t-elle une vraie histoire (réassurance, visages, mission) ?',
    'Recherche interne : les requêtes test fournies retournent-elles des résultats pertinents ?',
  ],
  perf_seo: [
    'Vitesse : score mesuré, opportunités concrètes (images trop lourdes, trop d\'applications)',
    'Visibilité Google : titres et descriptions Google uniques par page, textes descriptifs des images',
    'Données structurées produit (prix, stock, avis) présentes dans le HTML → marqueur <!--JSONLD',
    'GEO (lisibilité IA) : contenu descriptif riche, questions/réponses, politiques claires en texte (livraison, retours)',
    'GEO acheteur : la boutique répond-elle aux questions qu\'un client poserait à ChatGPT/Perplexity (comparatifs, guides d\'achat, Q/R) ?',
    'Contenu dupliqué entre fiches produits (paires quasi identiques détectées par Modify — fournies ci-dessous)',
    'robots.txt présent et n\'interdit pas l\'indexation',
    'sitemap.xml présent (plan du site pour Google)',
    'Maillage interne : la home renvoie-t-elle vers les fiches et le blog (liens internes dans le HTML) ?',
  ],
  trust: [
    'Badges de paiement / sécurité visibles sur la fiche produit',
    'Garanties et retours mentionnés sur la fiche produit (pas seulement en page séparée)',
    'Avis clients réels affichés (note, nombre) — si AUCUN avis n\'existe, le problème est "collecter des avis" (guide), jamais en inventer',
    'Page contact avec de vrais moyens (email, formulaire, téléphone)',
    'Mentions légales + conditions de vente + politique de confidentialité présentes',
    'Cohérence des informations légales : l\'entreprise (nom, adresse) visible dans le footer correspond-elle aux mentions légales ?',
    'Politique de livraison : délais et coûts clairement affichés AVANT le panier (fiche produit ou bandeau)',
    'FAQ : présente et couvrant les questions essentielles (livraison, retours, paiement, tailles, contact)',
    'Bandeau cookies / consentement (si décelable dans le HTML)',
    'https partout (les liens du HTML)',
  ],
  funnel: [
    'Panier : produits complémentaires suggérés, frais de livraison annoncés AVANT le paiement, messages de réassurance',
    'Paiement express visible (Shop Pay, Apple Pay, Google Pay) — cherche les marqueurs de boutons de paiement dans le HTML',
    'Produits complémentaires sur la fiche produit ("souvent achetés ensemble")',
    'Urgence HONNÊTE uniquement (vrai stock faible) — jamais de faux compteur',
    'Champ code promo visible',
    'Chemin home → produit : un produit phare est-il accessible en 1-2 clics depuis l\'accueil (liens produits directs sur la home) ?',
    'Filtres sur la page collection (prix, catégorie, disponibilité) — HTML collection fourni',
    'Pop-up / bandeau de bienvenue : présent et utile (code promo, newsletter) sans être intrusif',
    'Programme de fidélité ou de parrainage visible',
  ],
  mobile: [
    'Menu mobile (burger) présent et fonctionnel',
    'Achat rapide : bouton d\'achat accessible vite depuis la fiche produit (≤3 gestes)',
    'Bouton d\'achat fixe à l\'écran (sticky) sur les fiches produit longues',
    'Tailles tactiles : boutons et liens assez grands (≥44px — déduis-le des classes/styles si visibles)',
    'Texte lisible sans zoomer (≥16px — déduis-le si visible)',
    'Tableaux de caractéristiques / tailles lisibles sur petit écran (défilement horizontal prévu ?)',
    'Images adaptées au mobile (attributs responsive dans le HTML)',
    'Balise viewport présente',
  ],
  competitive: [
    'Identifier 2-3 concurrents directs réels (même niche, même marché) via recherche web',
    'Fourchette de prix : la boutique est-elle alignée, premium ou sous-positionnée face aux concurrents trouvés ?',
    'Avantages affichés par les concurrents et absents ici (livraison gratuite, garantie étendue, retours prolongés)',
    'Présence d\'avis clients chez les concurrents vs cette boutique',
    'Activité de contenu des concurrents (blog, guides) vs cette boutique',
  ],
}

/** Nombre total de points de contrôle réellement soumis aux agents. */
export const TOTAL_CHECKS = Object.values(AUDIT_CHECKS).reduce((s, l) => s + l.length, 0)

/** Checklist d'une catégorie, formatée pour le prompt de son agent. */
export function checklistFor(category: ProblemCategory): string {
  return AUDIT_CHECKS[category].map((c) => `- ${c}`).join('\n')
}
