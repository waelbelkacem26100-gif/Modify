# Audit Technique — Modify.io

> Réalisé le 2026-06-17. Corrections appliquées dans le même commit.

---

## Top 5 Priorités Absolues

| # | Problème | Sévérité | Statut |
|---|----------|----------|--------|
| 1 | **Bypass authentification preview** — token statique `modify-preview-2026` exposait les données production AquaDrive sans login | 🔴 | ✅ Corrigé |
| 2 | **`STRIPE_WEBHOOK_SECRET` absente** — toutes les webhooks Stripe silencieusement ignorées | 🔴 | À ajouter dans Vercel |
| 3 | **`CRON_SECRET` absente** — les crons ne sont pas sécurisés ; fallback dangereux sur `SHOPIFY_CLIENT_SECRET` dans `lib/approval-token.ts` | 🔴 | ✅ Fallback supprimé (fail-closed) · clé encore à ajouter dans Vercel |
| 4 | **`RESEND_API_KEY` absente** — rapports hebdo/mensuel et emails d'approbation silencieusement désactivés | 🟠 | À ajouter dans Vercel |
| 5 | **`ESTIMATED_DAILY_SESSIONS = 300` hardcodé** — taux de conversion faux pour toutes les boutiques | 🟠 | Backlog (nécessite analytics réel) |

---

## 1. Routes & API

### Routes preview supprimées
- `app/(site)/preview/` (3 fichiers) — pages démo publique sans auth → **supprimées**
- `app/api/autopilot/optimize/route.ts` — endpoint de test gated par `PREVIEW_TOKEN` → **supprimé**

### Bypasses d'authentification retirés
Tous les fichiers suivants importaient `PREVIEW_TOKEN` / `PREVIEW_ADMIN_USER_ID` de `lib/preview.ts` et court-circuitaient Clerk :

| Fichier | Type de bypass | Statut |
|---------|---------------|--------|
| `app/api/audit/strengths/route.ts` | `userId` fallback sur token | ✅ Corrigé |
| `app/api/proofs/route.ts` | `userId` fallback sur token | ✅ Corrigé |
| `app/api/copilot/missions/route.ts` | `userId` fallback sur token (GET) | ✅ Corrigé |
| `app/api/cron/competitor-monitor/route.ts` | `isPreview` bypass cron auth | ✅ Corrigé |
| `app/api/cron/price-suggest/route.ts` | `isPreview` bypass cron auth | ✅ Corrigé |
| `app/api/cron/trend-predict/route.ts` | `isPreview` bypass cron auth | ✅ Corrigé |

### Pages redirect-only supprimées (redirects 301 ajoutés dans `next.config.ts`)
| Page supprimée | Redirige vers |
|----------------|--------------|
| `/dashboard/audit` | `/dashboard` |
| `/dashboard/tracking` | `/dashboard/resultats` |
| `/dashboard/guides` | `/dashboard/accompagnement` |
| `/dashboard/corrections` | `/dashboard/fixes` |
| `/dashboard/resultats/preuves` | `/dashboard/resultats#galerie-impact` |

Fichier legacy jamais importé également supprimé : `app/(site)/dashboard/tracking/_legacy.tsx`.

---

## 2. Composants

### Composants orphelins supprimés (0 import externe)
- `components/dashboard/GlobalScoreCard.tsx` — appelait `/api/score`
- `components/dashboard/HealthCheck.tsx` — appelait `/api/health`
- `components/dashboard/MetricCard.tsx`
- `components/dashboard/PageSpeedCard.tsx`
- `components/dashboard/EmailReportButton.tsx`
- `components/dashboard/ActivationCard.tsx`
- `components/dashboard/DisconnectStoreButton.tsx`

### Page dupliquée supprimée
- `app/(site)/dashboard/corrections/page.tsx` — rendu identique à `/dashboard/fixes` (`<FixesContent />`)

### `withPreviewToken` retiré des composants clients
| Composant | Appel corrigé |
|-----------|--------------|
| `components/dashboard/AnalyseContent.tsx` | 2 appels → URLs directes |
| `components/proofs/ProofsContent.tsx` | 1 appel → URL directe |
| `components/dashboard/ModyCompanion.tsx` | 1 appel → URL directe |
| `components/dashboard/ModyBanner.tsx` | 1 appel → URL directe |

### Logique preview retirée de `Sidebar.tsx`
Variables `previewMode`, `previewQs`, `navHref` et la condition sur l'état actif supprimées.

---

## 3. Libs

### `lib/preview.ts` supprimé
Contenait `PREVIEW_TOKEN = 'modify-preview-2026'`, `PREVIEW_ADMIN_USER_ID`, et `withPreviewToken()`. Supprimé après nettoyage de toutes les références.

### Distinction importante — "preview" a deux sens dans ce projet
⚠️ **Conservé intentionnellement** : toutes les références à `preview` comme *statut de correction* (Group C — fix appliqué sur un thème non publié) :
- `fixes.status === 'preview'`
- `preview_theme_id` dans les stores
- `ProofType = 'google_preview'`
- `duplicateTheme()` / `promoteThemeToMain()` dans les libs Shopify

Ces features sont la fonctionnalité "aperçu avant publication" et n'ont pas été touchées.

---

## 4. Crons

Tous les 9 crons déclarés dans `vercel.json` ont leurs handlers présents et fonctionnels.

### Bug 🟠 — `ESTIMATED_DAILY_SESSIONS = 300` hardcodé
**Fichier** : `app/api/cron/sync-conversions/route.ts`  
**Impact** : Taux de conversion calculé comme `orders / 300` pour TOUTES les boutiques, quelle que soit leur taille réelle.  
**Action** : Backlog — nécessite intégration analytics (Google Analytics / Shopify Analytics API).

---

## 5. Webhooks

Les webhooks sont déclarés dans `shopify.app.toml` et gérés par la CLI Shopify (pas besoin d'enregistrement manuel). Handlers présents pour : `customers/data_request`, `customers/redact`, `shop/redact`, `products/create`, `products/update`, `themes/publish`, `orders/paid`.

### Bug 🔴 — `STRIPE_WEBHOOK_SECRET` absente du `.env.local`
**Impact** : La vérification de signature Stripe échoue silencieusement → aucun événement Stripe traité en dev.  
**Action** : Ajouter dans Vercel Dashboard + `.env.local`.

---

## 6. Variables d'Environnement

### Présentes dans le code, absentes de `.env.local`

| Variable | Utilisée dans | Impact si absente |
|----------|--------------|-------------------|
| `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe/route.ts` | 🔴 Webhooks Stripe ignorées |
| `CRON_SECRET` | Tous les crons + `lib/approval-token.ts` | 🔴 Crons non sécurisés |
| `RESEND_API_KEY` | `lib/email.ts` | 🟠 Emails silencieusement désactivés |
| `OPENAI_API_KEY` | `lib/blog-illustration.ts` | 🟡 Illustrations de blog désactivées (non bloquant) |
| `EMAIL_FROM` | `lib/email.ts` | 🟡 Fallback sur adresse Vercel codée en dur |

### `.env.example` mis à jour
Ajout de `RESEND_API_KEY`, `EMAIL_FROM`, `OPENAI_API_KEY`.

### Bug 🔴 — Fallback dangereux dans `lib/approval-token.ts` — ✅ Corrigé
Avant, si `CRON_SECRET` était absent, les tokens d'approbation étaient signés avec
`SHOPIFY_CLIENT_SECRET` (clé partagée avec Shopify OAuth — deux domaines de confiance).
Le fallback a été **supprimé** : `key()` ne lit plus que `CRON_SECRET` et renvoie `null`
sinon (fail-closed — aucun lien émis, aucune approbation acceptée). Il reste à **ajouter
`CRON_SECRET` dans Vercel** pour activer la fonctionnalité d'approbation par email.

---

## 7. Dépendances

Aucun package orphelin détecté. `sharp` correctement déclaré dans `serverExternalPackages`.

---

## 8. Supabase

### Colonne jamais incrémentée 🟡
- `product_performance.views_count` — créée dans `019_autopilot_v10.sql`, jamais écrite dans le code. Toujours à 0.

### Tables créées mais fonctionnalités partielles
| Table | État |
|-------|------|
| `webhook_events` | Créée, handler Shopify écrit et enregistré ✅ |
| `product_performance` | `views_count` jamais incrémenté 🟡 |
| `competitor_alerts` | Alimentée par le cron `competitor-monitor` ✅ |
| `trend_predictions` | Alimentée par le cron `trend-predict` ✅ |

---

## 9. Fonctionnalités Incomplètes

| Fonctionnalité | État | Fichier |
|----------------|------|---------|
| Sync conversions | Analytics hardcodé (300 sessions/j) | `app/api/cron/sync-conversions/route.ts` |
| Illustrations blog | Désactivé si `OPENAI_API_KEY` absent | `lib/blog-illustration.ts` |
| Emails rapports | Désactivé si `RESEND_API_KEY` absent | `lib/email.ts` |
| `product_performance.views_count` | Jamais écrit | `supabase/migrations/019_autopilot_v10.sql` |

---

## 10. Bugs Potentiels

| Bug | Sévérité | Fichier | Description |
|-----|----------|---------|-------------|
| ✅ Fallback `SHOPIFY_CLIENT_SECRET` pour signing | 🔴 | `lib/approval-token.ts` | Corrigé — fail-closed sur `CRON_SECRET` uniquement |
| Taux de conversion fixe 300/j | 🟠 | `cron/sync-conversions/route.ts` | Données analytics incorrectes |
| `RESEND_API_KEY` absente = emails silencieux | 🟠 | `lib/email.ts` | Échec silencieux sans log |
| `views_count` jamais incrémenté | 🟡 | Supabase `product_performance` | Métrique produit toujours à 0 |

---

## Actions Restantes (config & data — non code-only)

> Ces points exigent une action externe (secrets Vercel) ou une vraie source de
> données analytics : ils ne peuvent pas être « corrigés » par du code seul sans
> fabriquer de fausses métriques (ce que le produit évite partout).

1. **Ajouter dans Vercel Dashboard** :
   - `STRIPE_WEBHOOK_SECRET` (récupérer depuis Stripe Dashboard > Webhooks)
   - `CRON_SECRET` (générer avec `openssl rand -hex 32`) — désormais **obligatoire** pour les liens d'approbation (plus de fallback)
   - `RESEND_API_KEY` (depuis resend.com)
   - `EMAIL_FROM` (ex: `Modify <rapport@modify-coral.vercel.app>`)

2. **Remplacer `ESTIMATED_DAILY_SESSIONS`** par une vraie intégration analytics Shopify (GA4 / Shopify Analytics API). Sans source de sessions réelle, le `conversion_rate` resterait une approximation.

3. **Incrémenter `views_count`** dès qu'une source de pages vues existe (pixel / analytics) — aucun webhook Shopify ne fournit les vues produit.

---

## Corrections post-audit (parcours utilisateur — commit suivant)

| # | Correctif | Sévérité | Fichier |
|---|-----------|----------|---------|
| 1 | **Boucle de redirection infinie** `/dashboard/fixes ⟷ /dashboard/corrections` (le nettoyage avait laissé `fixes/page.tsx` rediriger vers la route 301 qui repointe vers lui) → toute la section Corrections cassée (`ERR_TOO_MANY_REDIRECTS`). `fixes/page.tsx` rend désormais `<FixesContent/>` directement. | 🔴 | `app/(site)/dashboard/fixes/page.tsx` |
| 2 | **Fallback de signature dangereux** retiré (cf. §6). | 🔴 | `lib/approval-token.ts` |
| 3 | **Navigation mobile incomplète** — la sidebar étant masquée < md, *Pilote automatique*, l'abonnement et la déconnexion Clerk étaient inaccessibles sur mobile. Bottom-nav enrichie : Accueil · Pilote · Impact · Compte (`UserButton` Clerk avec sign-out + lien abonnement) · thème. | 🟠 | `components/dashboard/MobileNav.tsx` |

> Limitation acceptée : la **déconnexion de boutique** (action destructive et rare) reste accessible depuis la sidebar desktop uniquement.

---

## Fichiers Supprimés (safe-to-delete list — complétée)

```
app/(site)/preview/                         # pages démo publique
app/api/autopilot/optimize/route.ts         # endpoint test
app/(site)/dashboard/audit/page.tsx         # redirect mort
app/(site)/dashboard/tracking/              # redirect mort + legacy
app/(site)/dashboard/guides/page.tsx        # redirect mort
app/(site)/dashboard/corrections/page.tsx   # doublon de /fixes
app/(site)/dashboard/resultats/preuves/     # redirect mort
components/dashboard/GlobalScoreCard.tsx    # orphelin
components/dashboard/HealthCheck.tsx        # orphelin
components/dashboard/MetricCard.tsx         # orphelin
components/dashboard/PageSpeedCard.tsx      # orphelin
components/dashboard/EmailReportButton.tsx  # orphelin
components/dashboard/ActivationCard.tsx     # orphelin
components/dashboard/DisconnectStoreButton.tsx # orphelin
app/api/health/route.ts                     # appelé uniquement par orphelin
app/api/score/route.ts                      # appelé uniquement par orphelin
lib/preview.ts                              # système démo — retiré
MIGRATION_NEW_APP.md                        # doc jamais référencée
MODY_BRANDING_NOTES.md                      # doc jamais référencée
```
