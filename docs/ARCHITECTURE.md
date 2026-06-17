# Documentation Technique Exhaustive — Modify

> Derniere mise a jour : 17 juin 2026
> Version du codebase : v0.1.0

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture des fichiers](#2-architecture-des-fichiers)
3. [Flux Shopify OAuth](#3-flux-shopify-oauth)
4. [Systeme d'audit](#4-systeme-daudit)
5. [Systeme de corrections](#5-systeme-de-corrections)
6. [Pilote automatique (Webhooks)](#6-pilote-automatique-webhooks)
7. [Mody Copilot](#7-mody-copilot)
8. [Stripe](#8-stripe)
9. [Supabase](#9-supabase)
10. [Clerk Auth](#10-clerk-auth)
11. [Resend](#11-resend)
12. [Vercel](#12-vercel)
13. [Design System](#13-design-system)
14. [Graphify](#14-graphify)
15. [Points d'attention / Pieges connus](#15-points-dattention--pieges-connus)

---

## 1. Vue d'ensemble

### Ce que fait Modify

Modify est un SaaS d'optimisation de conversion pour boutiques Shopify. Il audite automatiquement une boutique avec 7 agents IA specialises, detecte les problemes de conversion (fiches produit, UX, SEO, confiance, tunnel d'achat, mobile, concurrence), calcule l'impact en euros/mois de chaque probleme, et applique des correctifs automatiques ou genere des guides pas a pas.

Le produit tourne autour de trois piliers :
- **Audit IA** : 7 agents Claude analysent 62+ points de controle a partir de donnees reelles
- **Corrections automatiques** : Groupes A/B/C avec backup, verification et rollback
- **Pilote automatique** : Webhooks Shopify + crons pour optimiser en continu (SEO produit, regression, App Blocks, blog, images)

### Stack complete avec versions

| Technologie | Version | Role |
|-------------|---------|------|
| **Next.js** | ^15.2.3 (Turbopack) | Framework fullstack (App Router) |
| **React** | 19.0.0 | UI |
| **TypeScript** | ^5 | Typage |
| **Tailwind CSS** | ^3.4.17 | Styling |
| **@anthropic-ai/sdk** | ^0.37.0 | API Claude (audit, generation, chat) |
| **@clerk/nextjs** | ^6.12.9 | Authentification utilisateur |
| **@supabase/supabase-js** | ^2.46.1 | Base de donnees PostgreSQL |
| **@supabase/ssr** | ^0.5.2 | Supabase cote serveur |
| **Stripe** | ^17.4.0 | Paiement / abonnements |
| **Resend** | ^4.8.0 | Emails transactionnels |
| **Sharp** | ^0.34.5 | Compression d'images serveur |
| **Recharts** | ^2.13.3 | Graphiques (conversions, score) |
| **Lucide React** | ^0.468.0 | Icones |

**Hebergement** : Vercel (plan Hobby/Pro)
**Base de donnees** : Supabase (PostgreSQL manage)
**API Shopify** : REST Admin API v2025-01

### Variables d'environnement

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Cle publique Clerk |
| `CLERK_SECRET_KEY` | Cle secrete Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | URL de connexion (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | URL d'inscription (`/sign-up`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Redirect post-connexion (`/dashboard`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Redirect post-inscription (`/dashboard`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cle anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Cle service role (bypass RLS) |
| `STRIPE_SECRET_KEY` | Cle secrete Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Cle publique Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe |
| `ANTHROPIC_API_KEY` | Cle API Claude (Anthropic) |
| `SHOPIFY_CLIENT_ID` | Client ID de l'app Shopify |
| `SHOPIFY_CLIENT_SECRET` | Client Secret de l'app Shopify |
| `GOOGLE_PAGESPEED_API_KEY` | Cle API Google PageSpeed Insights |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app (`https://modify-coral.vercel.app`) |
| `CRON_SECRET` | Secret pour authentifier les crons Vercel |
| `RESEND_API_KEY` | Cle API Resend (emails) |
| `EMAIL_FROM` | Expediteur emails (`Modify <contact@modifea.com>`) |
| `SHOPIFY_THEME_EXTENSION_UUID` | UUID de l'extension App Blocks deployee |
| `SHOPIFY_APP_HANDLE` | Handle de l'app dans le theme editor (override) |

---

## 2. Architecture des fichiers

```
modify/
├── app/                              # Next.js 15 App Router
│   ├── (site)/                       # Routes principales (Clerk auth)
│   │   ├── (auth)/                   # Sign-in / Sign-up (Clerk prebuilt)
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── dashboard/                # Routes protegees (auth requise)
│   │   │   ├── page.tsx              # Tableau de bord principal
│   │   │   ├── layout.tsx            # Sidebar + ModyCompanion + TokenGuard
│   │   │   ├── audit/page.tsx        # Resultats d'audit
│   │   │   ├── connect/page.tsx      # Connexion Shopify OAuth
│   │   │   ├── corrections/page.tsx  # Problemes detectes
│   │   │   ├── fixes/page.tsx        # Correctifs appliques
│   │   │   ├── resultats/page.tsx    # KPIs et impact
│   │   │   ├── resultats/preuves/page.tsx  # Preuves avant/apres
│   │   │   ├── seo/page.tsx          # Audit et corrections SEO
│   │   │   ├── products/page.tsx     # Optimisation produits
│   │   │   ├── pilote/page.tsx       # Vue pilote automatique
│   │   │   ├── suivi/page.tsx        # Suivi temporel
│   │   │   ├── guides/page.tsx       # Liste des guides
│   │   │   ├── guide/page.tsx        # Detail d'un guide
│   │   │   ├── agent/page.tsx        # Chat avec Mody
│   │   │   ├── winning-products/page.tsx  # Produits gagnants
│   │   │   ├── subscription/page.tsx # Abonnement Stripe
│   │   │   └── accompagnement/page.tsx  # Accompagnement personnalise
│   │   ├── contact/page.tsx          # Page contact
│   │   ├── legal/page.tsx            # Mentions legales
│   │   ├── privacy/page.tsx          # Politique de confidentialite
│   │   ├── terms/page.tsx            # CGV
│   │   ├── preview/                  # Mode demo public (sans auth)
│   │   │   ├── page.tsx
│   │   │   ├── pilote/page.tsx
│   │   │   └── resultats/page.tsx
│   │   ├── page.tsx                  # Landing page
│   │   └── layout.tsx                # ClerkProvider wrapper
│   ├── api/                          # API Routes
│   │   ├── audit/
│   │   │   ├── start/route.ts        # Declenchement audit
│   │   │   ├── step/route.ts         # Execution pas a pas (auto-chainee)
│   │   │   └── strengths/route.ts    # Points forts de l'audit
│   │   ├── fixes/
│   │   │   ├── generate/route.ts     # Generation des correctifs
│   │   │   ├── apply/route.ts        # Application d'un correctif
│   │   │   ├── apply-all/route.ts    # Application de tous les correctifs
│   │   │   ├── approve/route.ts      # Approbation 1-clic (mode approval)
│   │   │   ├── rollback/route.ts     # Rollback d'un correctif
│   │   │   ├── rollback-all/route.ts # Rollback de tous
│   │   │   ├── promote/route.ts      # Promotion theme preview → main
│   │   │   └── screenshot/route.ts   # Screenshots avant/apres
│   │   ├── shopify/
│   │   │   ├── install/route.ts      # Etape 1 : redirection OAuth
│   │   │   ├── callback/route.ts     # Etape 2 : echange code → token
│   │   │   ├── token-exchange/route.ts  # Echange session token (embedded)
│   │   │   ├── claim/route.ts        # Liaison store ↔ user
│   │   │   └── disconnect/route.ts   # Deconnexion boutique
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts     # Creation session Stripe Checkout
│   │   │   ├── portal/route.ts       # Portail client Stripe
│   │   │   └── webhook/route.ts      # Webhook Stripe
│   │   ├── webhooks/                 # Webhooks Shopify
│   │   │   ├── products/create/route.ts   # Nouveau produit → optimisation
│   │   │   ├── products/update/route.ts   # Modif produit → detection regression
│   │   │   ├── themes/publish/route.ts    # Changement theme → reinstallation App Blocks
│   │   │   ├── orders/paid/route.ts       # Commande payee → product_performance
│   │   │   ├── customers/data_request/route.ts  # RGPD
│   │   │   ├── customers/redact/route.ts        # RGPD
│   │   │   └── shop/redact/route.ts             # RGPD
│   │   ├── cron/                     # Jobs planifies (Vercel crons)
│   │   │   ├── sync-conversions/route.ts    # Quotidien 3h : synchro conversions
│   │   │   ├── optimize-images/route.ts     # Lundi 3h : compression images
│   │   │   ├── blog-articles/route.ts       # Mardi 4h : article SEO
│   │   │   ├── weekly-report/route.ts       # Lundi 8h : rapport hebdo
│   │   │   ├── winning-products/route.ts    # Quotidien 6h : produits gagnants
│   │   │   ├── monthly-report/route.ts      # 1er du mois 9h : bilan mensuel
│   │   │   ├── competitor-monitor/route.ts  # 1er du mois 5h : veille concurrence
│   │   │   ├── trend-predict/route.ts       # 15 du mois 5h : predictions tendances
│   │   │   └── price-suggest/route.ts       # 2 du mois 5h : suggestions prix
│   │   ├── agent/chat/route.ts       # Chat Mody (Claude)
│   │   ├── copilot/missions/route.ts # Missions Copilot (CRUD)
│   │   ├── blog/generate/route.ts    # Generation article blog
│   │   ├── products/                 # API produits
│   │   │   ├── list/route.ts
│   │   │   ├── generate/route.ts
│   │   │   ├── apply/route.ts
│   │   │   └── winning/route.ts
│   │   ├── seo/
│   │   │   ├── audit/route.ts
│   │   │   └── fix-all/route.ts
│   │   ├── pagespeed/route.ts        # Google PageSpeed
│   │   ├── score/route.ts            # Score global Modify
│   │   ├── proofs/route.ts           # Preuves d'impact
│   │   ├── images/compress/route.ts  # Compression d'images
│   │   ├── promos/route.ts           # Promotions
│   │   ├── bundles/route.ts          # Bundles cross-sell
│   │   ├── guides/route.ts           # Guides d'accompagnement
│   │   ├── store/mode/route.ts       # Basculement auto/approval
│   │   ├── health/route.ts           # Health check
│   │   ├── email/test/route.ts       # Test email
│   │   ├── extensions/status/route.ts  # Statut extensions
│   │   └── autopilot/optimize/route.ts # Optimisation manuelle
│   ├── shopify/                      # Surface embeddee App Bridge
│   │   ├── page.tsx                  # Page principale embedded
│   │   └── AppBridgeRefresh.tsx      # Token Exchange automatique
│   ├── layout.tsx                    # Root layout (fonts, theme init)
│   └── globals.css                   # Variables CSS, utilities
│
├── components/                       # Composants React
│   ├── ui/                           # Primitifs (Button, Card, Badge, Progress)
│   ├── brand/                        # Mody (ModyAvatar, BackgroundParticles, EmptyStateIllustration)
│   ├── dashboard/                    # ~40 composants dashboard
│   ├── landing/                      # Landing page (Hero, Pricing, FAQ, etc.)
│   ├── proofs/                       # Preuves d'impact (GooglePreviewBeforeAfter, etc.)
│   ├── legal/                        # Shell legal
│   └── ThemeToggle.tsx               # Bascule dark/light
│
├── lib/                              # Logique metier
│   ├── audit/                        # Moteur d'audit v3
│   │   ├── checks.ts                 # 62 checks (source unique)
│   │   ├── types.ts                  # Problem, Strength, AuditAgentInput
│   │   ├── orchestrator.ts           # runAuditStep(), runFullAuditSequential()
│   │   ├── collect.ts                # Collecte donnees reelles par categorie
│   │   ├── geo.ts                    # Simulation GEO (deterministe, zero LLM)
│   │   ├── accessibility.ts          # Checks WCAG (deterministes)
│   │   ├── strengths.ts              # Points forts depuis donnees reelles
│   │   └── agents/                   # 7 agents IA specialises
│   │       ├── shared.ts             # runAgentPrompt(), calibration(), parsing
│   │       ├── product-pages.ts      # Agent Fiches produits
│   │       ├── ui-ux.ts              # Agent Apparence & navigation
│   │       ├── performance-seo.ts    # Agent Vitesse & SEO
│   │       ├── trust.ts              # Agent Confiance
│   │       ├── funnel.ts             # Agent Tunnel d'achat
│   │       ├── mobile.ts             # Agent Experience mobile
│   │       └── competitive.ts        # Agent Concurrence (+ web_search)
│   ├── autopilot/                    # Moteur pilote automatique v10
│   │   ├── product-optimizer.ts      # Optimisation auto d'un produit
│   │   ├── regression.ts             # Detection regression + restauration
│   │   ├── theme-reinstall.ts        # Reinstallation App Blocks
│   │   ├── order-performance.ts      # Alimentation product_performance
│   │   ├── webhook-log.ts            # Ingestion securisee webhooks
│   │   ├── web-search.ts             # Helper recherche web (Anthropic tool)
│   │   ├── competitive.ts            # Veille concurrentielle
│   │   ├── pricing.ts                # Suggestions de prix
│   │   └── trends.ts                 # Predictions de tendances
│   ├── copilot/                      # Systeme de missions Mody
│   │   ├── mission-types.ts          # 6 types, 4 metiers, mappings
│   │   ├── missions.ts               # CRUD missions, liaison audit ↔ guide
│   │   └── mission-runner.ts         # Generation contenu reel (Claude)
│   ├── proofs/                       # Preuves d'impact
│   │   ├── build-proof.ts            # Construction avant/apres
│   │   └── types.ts                  # Types preuves
│   ├── anthropic.ts                  # Client Anthropic (audit legacy, generation, chat)
│   ├── shopify.ts                    # Client API Shopify complet (900+ lignes)
│   ├── shopify-token.ts              # Gestion expiration/refresh token
│   ├── shopify-session.ts            # Session Shopify embedded
│   ├── shopify-app-blocks.ts         # Installation App Blocks via product.json
│   ├── shopify-claim.ts              # Liaison store ↔ user Clerk
│   ├── shopify-webhook.ts            # Registration webhooks
│   ├── fix-pipeline.ts               # Pipeline Groupe A (backup → apply → verify)
│   ├── fix-capability.ts             # Classification auto/guide
│   ├── fix-learning.ts               # Apprentissage des corrections
│   ├── fix-presentation.ts           # Presentation UI des corrections
│   ├── theme-backup.ts               # Backup theme + classification risk group
│   ├── store-score.ts                # Score global /100
│   ├── conversion-score.ts           # Score produit /10
│   ├── pagespeed.ts                  # Integration Google PSI
│   ├── config.ts                     # Admin user IDs
│   ├── pricing.ts                    # Plans et prix (source unique)
│   ├── subscription.ts               # Gestion abonnements
│   ├── stripe.ts                     # Client Stripe
│   ├── email.ts                      # Templates et envoi emails (Resend)
│   ├── blog-generator.ts             # Pipeline generation blog
│   ├── blog-illustration.ts          # Illustrations articles (OpenAI gpt-image-1)
│   ├── image-compress.ts             # Compression Sharp
│   ├── image-optimizer.ts            # Pipeline optimisation images
│   ├── agent-context.ts              # Contexte complet pour chat Mody
│   ├── mody-companion.ts             # Evenement global d'ouverture Mody
│   ├── audit-log.ts                  # Journalisation audit_logs
│   ├── store-mode.ts                 # Basculement auto/approval
│   ├── supabase.ts                   # Client Supabase navigateur
│   ├── supabase-server.ts            # Client Supabase service role
│   ├── weekly-report.ts              # Assemblage rapport hebdo
│   ├── monthly-report.ts             # Assemblage rapport mensuel
│   ├── weekly-maintenance.ts         # Maintenance hebdomadaire
│   ├── winning-products.ts           # Detection produits gagnants
│   ├── cross-sell.ts                 # Cross-sell IA
│   ├── promo-engine.ts               # Moteur promotionnel
│   ├── seo-audit.ts                  # Audit SEO simplifie
│   ├── seo-fix.ts                    # Corrections SEO
│   ├── health-check.ts               # Verification sante boutique
│   ├── preview.ts                    # Mode preview (demo publique)
│   ├── pilote-feed.ts                # Feed pilote automatique
│   ├── suivi-data.ts                 # Donnees de suivi
│   ├── approval-token.ts             # Token d'approbation 1-clic
│   ├── apply-pending.ts              # Application des correctifs en attente
│   ├── screenshot.ts                 # Captures d'ecran
│   └── use-count-up.ts              # Hook React animation compteur
│
├── types/index.ts                    # Types TypeScript globaux
├── middleware.ts                     # Middleware Clerk (protection routes)
├── supabase/                         # Migrations et schema
│   ├── schema.sql                    # Schema de base
│   ├── CONSOLIDATED_003_to_012.sql   # Consolidation migrations
│   └── migrations/                   # 19 fichiers de migration
├── extensions/modify-blocks/         # Extension theme Shopify (App Blocks)
├── graphify-out/                     # Knowledge graph du projet
├── vercel.json                       # Crons Vercel
├── tailwind.config.ts                # Configuration Tailwind
├── next.config.ts                    # Configuration Next.js
├── tsconfig.json                     # Configuration TypeScript
└── package.json                      # Dependances
```

---

## 3. Flux Shopify OAuth

### Etape par etape

```
Utilisateur                    Modify                         Shopify
    │                            │                               │
    ├─── Clique "Connecter" ────►│                               │
    │                            ├── Genere state (random 16B) ──│
    │                            ├── Stocke state + userId       │
    │                            │   dans cookies HTTP-only      │
    │                            ├── Redirige vers ──────────────►│
    │                            │   /admin/oauth/authorize       │
    │                            │   ?client_id=...&scope=...     │
    │                            │   &redirect_uri=.../callback   │
    │                            │   &state=...                   │
    │                            │                               │
    │◄────────── Marchand autorise l'app ──────────────────────── │
    │                            │                               │
    │                            │◄── Callback GET avec ──────── │
    │                            │    code, shop, state, hmac     │
    │                            │                               │
    │                            ├── Verifie HMAC (SHA-256)      │
    │                            ├── Verifie state == cookie      │
    │                            ├── Verifie userId du cookie     │
    │                            │                               │
    │                            ├── POST /admin/oauth/access_token
    │                            │   { client_id, client_secret,  │
    │                            │     code }                     │
    │                            │◄── { access_token,             │
    │                            │     expires_in?, refresh_token? }
    │                            │                               │
    │                            ├── GET /admin/api/shop.json    │
    │                            │   (recupere nom, plan)        │
    │                            │                               │
    │                            ├── UPSERT dans Supabase        │
    │                            │   stores (shop_domain unique)  │
    │                            │   access_token, refresh_token, │
    │                            │   token_expires_at             │
    │                            │                               │
    │◄── Redirect /dashboard ──  │                               │
    │   (cookies effaces)        │                               │
```

### Fichiers concernes

| Fichier | Role |
|---------|------|
| `app/api/shopify/install/route.ts` | Genere le state, construit l'URL d'autorisation, stocke state + userId en cookies |
| `app/api/shopify/callback/route.ts` | Valide HMAC + state, echange code → token, upsert dans Supabase |
| `app/api/shopify/token-exchange/route.ts` | Echange session token → offline token (pour l'app embedded) |
| `lib/shopify.ts` | `buildInstallUrl()`, `exchangeCodeForToken()`, `exchangeSessionToken()`, `refreshAccessToken()`, `validateHmac()` |
| `lib/shopify-token.ts` | `getTokenStatus()`, `needsReconnect()`, `getValidAccessToken()` |

### Scopes demandes

```typescript
const SHOPIFY_SCOPES = [
  'read_themes', 'write_themes',
  'read_products', 'write_products',
  'read_content', 'write_content',
  'read_analytics', 'read_orders',
].join(',')
```

### Gestion du token

Les tokens offline Shopify sont **permanents** (pas d'`expires_in` ni de `refresh_token`). Seuls les tokens issus du Token Exchange (app embedded) expirent.

**`lib/shopify-token.ts`** gere trois etats :
- `valid` : token utilisable (pas d'expiration OU pas encore expire)
- `expiring` : expire dans moins de 6 heures → refresh automatique
- `expired` : expire ET pas de refresh_token → le marchand doit se reconnecter

Le refresh se fait via `refreshAccessToken()` qui POST sur `/admin/oauth/access_token` avec `grant_type: 'refresh_token'`. Le nouveau token + refresh_token sont persistes dans Supabase.

---

## 4. Systeme d'audit

### Declenchement

1. **`POST /api/audit/start`** : Cree un audit `status='running'` dans Supabase, puis lance le premier step via `after()` (pattern auto-chaine)
2. **`POST /api/audit/step`** (interne) : Execute UNE categorie d'agent, persiste les resultats, chaine le step suivant
3. **`GET /api/audit/start`** : Watchdog — si un audit est bloque depuis >10 min, relance le step courant

### Les 62 checks

Source unique : **`lib/audit/checks.ts`**

Chaque check est une phrase en francais injectee dans le prompt de l'agent correspondant.

#### Fiches produits (`products`) — 11 checks

| # | Point de controle |
|---|-------------------|
| 1 | Titres : longueur ideale 50-70 caracteres, mot-cle + benefice client |
| 2 | Descriptions : >300 mots, benefices AVANT caracteristiques, Q/R integrees |
| 3 | Photos : minimum 3 par produit, textes descriptifs presents |
| 4 | Prix psychologique : 49,90 EUR plutot que 50 EUR, prix barre |
| 5 | Variantes : noms clairs ("Bleu ocean / Taille L") |
| 6 | Guide des tailles / compatibilite |
| 7 | Coherence du ton entre descriptions |
| 8 | Mots risques : allegations sante, superlatifs juridiques |
| 9 | Structure des descriptions : listes, Q/R, tableaux |
| 10 | Prix incoherents entre produits proches |
| 11 | Tags et categorisation |

#### Apparence & navigation (`uiux`) — 10 checks

| # | Point de controle |
|---|-------------------|
| 1 | Hierarchie de la home : banniere + preuve sociale + categories |
| 2 | Bouton d'achat visible sans scroll |
| 3 | Menu <= 7 entrees, barre de recherche visible |
| 4 | Fil d'Ariane sur fiches produit |
| 5 | Pied de page complet |
| 6 | Bandeau d'avantages en haut de page |
| 7 | Contraste bouton d'achat principal |
| 8 | Coherence visuelle home ↔ fiche produit |
| 9 | Page "A propos" avec vraie histoire |
| 10 | Recherche interne : resultats pertinents |

#### Vitesse & visibilite Google (`perf_seo`) — 9 checks

| # | Point de controle |
|---|-------------------|
| 1 | Vitesse : score mesure, opportunites concretes |
| 2 | Titres et descriptions Google uniques par page |
| 3 | Donnees structurees produit (prix, stock, avis) |
| 4 | GEO lisibilite IA : contenu descriptif riche, Q/R |
| 5 | GEO acheteur : la boutique repond-elle aux questions ChatGPT/Perplexity |
| 6 | Contenu duplique entre fiches |
| 7 | robots.txt present et n'interdit pas l'indexation |
| 8 | sitemap.xml present |
| 9 | Maillage interne |

#### Confiance & securite (`trust`) — 10 checks

| # | Point de controle |
|---|-------------------|
| 1 | Badges de paiement / securite visibles |
| 2 | Garanties et retours mentionnes sur fiche produit |
| 3 | Avis clients reels affiches |
| 4 | Page contact avec vrais moyens |
| 5 | Mentions legales + CGV + confidentialite |
| 6 | Coherence informations legales |
| 7 | Politique de livraison : delais et couts AVANT le panier |
| 8 | FAQ presente et pertinente |
| 9 | Bandeau cookies / consentement |
| 10 | HTTPS partout |

#### Tunnel d'achat (`funnel`) — 9 checks

| # | Point de controle |
|---|-------------------|
| 1 | Panier : produits complementaires, frais annonces, reassurance |
| 2 | Paiement express visible (Shop Pay, Apple Pay, Google Pay) |
| 3 | Produits complementaires sur fiche produit |
| 4 | Urgence HONNETE uniquement (vrai stock faible) |
| 5 | Champ code promo visible |
| 6 | Chemin home → produit en 1-2 clics |
| 7 | Filtres sur page collection |
| 8 | Pop-up bienvenue utile sans etre intrusif |
| 9 | Programme de fidelite ou parrainage visible |

#### Experience mobile (`mobile`) — 8 checks

| # | Point de controle |
|---|-------------------|
| 1 | Menu mobile (burger) present et fonctionnel |
| 2 | Bouton d'achat accessible en <= 3 gestes |
| 3 | Bouton d'achat sticky sur fiches longues |
| 4 | Tailles tactiles >= 44px |
| 5 | Texte lisible sans zoom >= 16px |
| 6 | Tableaux lisibles sur petit ecran |
| 7 | Images adaptees au mobile (responsive) |
| 8 | Balise viewport presente |

#### Concurrence & positionnement (`competitive`) — 5 checks

| # | Point de controle |
|---|-------------------|
| 1 | Identifier 2-3 concurrents directs reels via recherche web |
| 2 | Fourchette de prix : alignee, premium ou sous-positionnee |
| 3 | Avantages affiches par les concurrents et absents ici |
| 4 | Presence d'avis clients chez les concurrents vs cette boutique |
| 5 | Activite de contenu des concurrents vs cette boutique |

**Total : 62 checks** (+ checks deterministes d'accessibilite et GEO qui s'ajoutent dynamiquement)

### Appels API Anthropic

**Fichier** : `lib/audit/agents/shared.ts` — fonction `runAgentPrompt()`

| Parametre | Valeur |
|-----------|--------|
| **Modele** | `claude-opus-4-8` |
| **Max tokens** | 3000 (agents standards), 4000 (agent concurrentiel) |
| **Temperature** | Defaut SDK (non specifiee = deterministe) |

**Structure du prompt** (chaque agent) :

```
Tu es l'agent « [categorie] » [emoji] de Modify...
Boutique : [nom] ([domaine]) — Theme : [nom] — [n] produits actifs.
[Calibration revenue : plafond 25% du CA]

═══ TA MISSION ═══
[Mission specifique a la categorie]

═══ POINTS DE CONTROLE MINIMUM ═══
[Checklist de checks.ts]

═══ DONNEES REELLES DE LA BOUTIQUE ═══
[Donnees collectees par collect.ts]

═══ REGLES ABSOLUES ═══
1. HONNETETE : ne pas inventer si donnee manquante
2. PRECISION : citer elements exacts dans affected_items
3. ZERO JARGON : interdits LCP, CLS, JSON-LD, API, H1...
4. capability : "auto" seulement si Modify peut corriger
5. risk_group : a/b/c selon le type de modification
6. Pas de double-comptage entre categories
7. Donnee manquante ≠ probleme chiffre

═══ FORMAT DE SORTIE ═══
[JSON array strict]
```

### Appels Shopify API pendant l'audit

**Fichier** : `lib/audit/collect.ts` — fonction `collectForCategory()`

| Endpoint | Donnee collectee | Utilise par |
|----------|------------------|-------------|
| `GET /admin/api/2025-01/products.json` | Catalogue complet (50 produits) | Tous les agents |
| `GET /admin/api/2025-01/pages.json` | Pages du site (FAQ, guides) | perf_seo, trust |
| `GET /admin/api/2025-01/themes.json` | Theme actif | Tous |
| `GET /admin/api/2025-01/themes/{id}/assets.json` | Liste des fichiers du theme | uiux, mobile |
| `GET /admin/api/2025-01/themes/{id}/assets.json?asset[key]=...` | Contenu d'un fichier specifique | uiux, mobile, funnel |
| `GET /admin/api/2025-01/orders.json` | Commandes 30j (CA mensuel) | Calibration revenue |
| Fetch `https://{shop}` (vitrine publique) | HTML de la home, fiche produit, collection, panier | Tous (nettoyage scripts/styles) |
| Fetch mobile (User-Agent mobile) | HTML mobile | mobile |
| `GET /search/suggest.json?q=...` | Resultats recherche interne | uiux |

### Google PageSpeed

**Fichier** : `lib/pagespeed.ts`

```
GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed
  ?url={url}&key={GOOGLE_PAGESPEED_API_KEY}&strategy=mobile&category=performance
```

- Timeout : 60 secondes
- Metriques extraites : score (0-100), LCP, CLS, TBT, FCP, SpeedIndex, TTI
- Opportunites : jusqu'a 6, triees par savings en ms
- **Regle d'honnetete** : si la vitrine est protegee par mot de passe, la mesure est sautee (`null`)

### Agent concurrentiel et web_search

**Fichier** : `lib/audit/agents/competitive.ts` + `lib/autopilot/web-search.ts`

L'agent concurrentiel est le **dernier** de la chaine (recoit `previousFindings` pour eviter le double-comptage).

Il utilise le tool serveur Anthropic `web_search_20260209` (execute cote Anthropic) :
- Max 3 recherches web
- Gestion du `pause_turn` (boucle max 4 iterations)
- Cherche "niche + e-commerce" pour trouver des concurrents reels
- Extrait prix, politique livraison, avis, contenu

### Simulation GEO

**Fichier** : `lib/audit/geo.ts` — 100% deterministe, zero LLM

Verifie si la boutique a le contenu que ChatGPT/Perplexity/Gemini exigent pour recommander un produit :

| Signal | Detection | Points |
|--------|-----------|--------|
| Pages guides (>= 1) | Regex `guide|comment choisir|comparatif|vs|tuto` sur handle + titre, min 100 mots | +25 |
| Pages guides (>= 2) | Idem | +10 |
| FAQ presente | Regex `faq|questions frequentes|aide|support`, min 150 mots | +20 |
| Descriptions riches (>= 50% des produits avec >= 200 mots) | Comptage direct | +25 |
| Contenu comparatif | Regex `comparatif|meilleur|choisir entre` dans HTML home ou titres guides | +10 |
| 100% descriptions riches | Tous les produits >= 200 mots | +10 |

Score GEO : 0-100, injecte dans le prompt de l'agent perf_seo.

### Calcul du score /100

**Fichier** : `lib/store-score.ts`

```
Score = Speed × 0.30 + Content × 0.35 + Fixes × 0.25 + SEO × 0.10
```

| Composante | Poids | Source | Calcul |
|------------|-------|--------|--------|
| **Speed** | 30% | `pagespeed_scores` | Dernier score mobile PageSpeed (0-100) |
| **Content** | 35% | API Shopify produits | 60% × (produits avec description / total) + 40% × (images avec alt / total images) |
| **Fixes** | 25% | Table `fixes` | correctifs appliques / (appliques + en attente) |
| **SEO** | 10% | Table `blog_articles` | min(articles 30j, 4) / 4 × 100 |

### Calcul des euros/mois par probleme

**Calibration IA** (`lib/audit/agents/shared.ts` — `calibration()`) :

- Si CA mensuel >= 200 EUR : la somme des impact_euros ne peut depasser 25% du CA. Un probleme isole < 10% du CA.
- Si CA inconnu/faible : 10-80 EUR/mois par probleme, jamais > 120 EUR.

**Impact vitesse** (`lib/pagespeed.ts` — `pageSpeedImpactEuros()`) :
- Score >= 90 : 0 EUR
- Chaque point en dessous de 90 : ~0.4% du CA mensuel (plafond 20%)
- Base par defaut si CA inconnu : 5 000 EUR/mois

### Stockage Supabase

Les resultats d'audit sont stockes dans :

| Table | Champs cles |
|-------|------------|
| `audits` | `id`, `store_id`, `status`, `results` (JSONB — tableau de Problem), `total_impact_euros` |
| `audit_logs` | `action='audit_category_done'` avec `details.audit_id`, `details.category`, `details.count` |
| `audit_logs` | `action='audit_strengths'` avec `details.strengths[]` |
| `audit_logs` | `action='audit_module_checks'` avec `details.module`, `details.checks` |
| `pagespeed_scores` | `store_id`, `score`, `lcp_ms`, `cls`, `tbt_ms`, etc. |
| `store_score_snapshots` | `store_id`, `score`, `recovered_euros`, `potential_euros`, `components` |

---

## 5. Systeme de corrections

### Pipeline complet

```
BACKUP → APPLY → VERIFY → PROOF → STATUS
```

1. **BACKUP** : Sauvegarde de l'etat avant modification
   - Groupe A : snapshot JSON dans `fixes.original_file_content` (descriptions, SEO meta, alt texts)
   - Groupe B : `original_file_content` = contenu original du fichier Liquid
   - Groupe C : duplication complete du theme (`duplicateTheme()`)

2. **APPLY** : Application de la correction
   - Groupe A : appels API Shopify (`updateProductDescription()`, `updateProductImageAlt()`, `updateProductMetafields()`)
   - Groupe B : injection Liquid dans le fichier theme (`updateThemeAsset()`) OU installation App Block (`enableProductAppBlock()`)
   - Groupe C : modifications sur un theme preview (non publie)

3. **VERIFY** : Relecture Shopify pour confirmer que la modification a pris
   - `verifyThemeAsset()` : lit l'asset et cherche le snippet attendu

4. **PROOF** : Capture de preuve (screenshot avant/apres si pertinent)
   - Stocke dans `fixes.screenshot_before` / `fixes.screenshot_after`

5. **STATUS** : "Corrige" seulement si verify == true
   - `status = 'applied'` si verifie
   - `status = 'failed'` sinon

### Groupes A/B/C

**Fichier** : `lib/theme-backup.ts` — `classifyRiskGroup()`

| Groupe | Risque | Contenu | Corrections |
|--------|--------|---------|-------------|
| **A** | Faible | API Produits / SEO uniquement | Descriptions produit, titres/descriptions Google, alt text images, donnees structurees JSON-LD, FAQ produit, metafields SEO |
| **B** | Moyen | Bloc ajoute a une page existante | Badges de confiance, avis social proof, compteur d'urgence, cross-sell, badges paiement |
| **C** | Eleve | Structure de page / navigation | Layout, menu, checkout, theme complet |

**Classification autoritaire** (`classifyRiskGroup()`) :
- `product` ou `products` → toujours `a`
- Titre contenant "alt text", "JSON-LD", "meta title/description" → toujours `a`
- Sinon, utilise la valeur retournee par Claude (si a/b/c), sinon derive de la categorie

### Backup theme

**Fichier** : `lib/theme-backup.ts` — `getOrCreateSessionBackup()`

- Cree un theme non publie nomme "Modify Backup [date] [heure]"
- Reutilise un backup existant si < 24h
- Persiste le `backup_theme_id` sur la table `stores`

### Injections Liquid

**Fichier** : `lib/anthropic.ts` — `generateFix()`

Pour les corrections Groupe B, Claude genere :
1. Un **anchor** : ligne existante dans le fichier Liquid (ex: `{{ product.title | escape }}`)
2. Du **code** : nouveau Liquid a injecter juste apres l'anchor

Securite :
- `extractRealAnchors()` extrait les ancres valides du fichier reel
- Si Claude invente un anchor qui n'existe pas, fallback sur une ancre prioritaire (`ANCHOR_FALLBACK_PRIORITY`)
- Le fichier original est sauvegarde dans `fixes.original_file_content`

### Rollback

- **Groupe A** : `restoreGroupABackup()` dans `lib/fix-pipeline.ts` — restaure descriptions, SEO meta, alt texts via l'API Shopify
- **Groupe B** : restaure le `original_file_content` via `updateThemeAsset()`
- **Groupe C** : theme preview non publie, donc rien a rollback (ou suppression du theme preview)

### App Blocks

**Fichier** : `lib/shopify-app-blocks.ts`

Pour les themes "Online Store 2.0" ou l'injection Liquid est rejetee (ex: Horizon), les corrections Groupe B utilisent des **App Blocks** installes via `templates/product.json`.

**Blocs disponibles** (`appBlockForFix()`) :

| Pattern dans le titre | Block handle | Block key |
|----------------------|--------------|-----------|
| review, rating, avis, social proof | `social-proof` | `modify_social_proof` |
| trust, guarantee, badge | `trust-badges` | `modify_trust_badges` |
| urgency, stock, countdown | `urgency` | `modify_urgency` |
| cross-sell, upsell, complementaire | `cross-sell` | `modify_cross_sell` |

**Processus** (`enableProductAppBlock()`) :
1. Recupere le handle de l'app via GraphQL (`currentAppInstallation.app.handle`)
2. Lit `templates/product.json`
3. Trouve la section produit principale (`pickProductSectionKey()`)
4. Ajoute le bloc dans `section.blocks` avec le type `shopify://apps/{handle}/blocks/{block}/{UUID}`
5. Ecrit le JSON modifie
6. **Verification critique** : relit le template — Shopify supprime silencieusement les blocs non resolus. Si le bloc a disparu → `status: 'unavailable'`

### Stockage Supabase

| Table | Champs cles |
|-------|------------|
| `fixes` | `id`, `audit_id`, `type`, `title`, `description`, `impact_euros`, `status`, `liquid_before`, `liquid_after`, `file_path`, `theme_id`, `backup_theme_id`, `original_file_content`, `risk_group`, `verification_status`, `preview_theme_id`, `screenshot_before`, `screenshot_after` |
| `audit_logs` | `action='fix_applied'`, `action='fix_rolled_back'`, `action='fix_backup_saved'` |

---

## 6. Pilote automatique (Webhooks)

### Les 4 webhooks

| Endpoint | Evenement Shopify | Fichier |
|----------|-------------------|---------|
| `/api/webhooks/products/create` | `products/create` | `app/api/webhooks/products/create/route.ts` |
| `/api/webhooks/products/update` | `products/update` | `app/api/webhooks/products/update/route.ts` |
| `/api/webhooks/themes/publish` | `themes/publish` | `app/api/webhooks/themes/publish/route.ts` |
| `/api/webhooks/orders/paid` | `orders/paid` | `app/api/webhooks/orders/paid/route.ts` |

Tous suivent le meme pattern :
1. Verification signature HMAC (`verifyWebhookHmac()`)
2. Resolution du store via `x-shopify-shop-domain`
3. Journalisation dans `webhook_events` (sans PII)
4. Traitement en arriere-plan via `after()` (reponse 200 immediate)
5. Mise a jour `webhook_events.processed_at` + `result`

### products/create — Pipeline complet

**Fichier** : `app/api/webhooks/products/create/route.ts` + `lib/autopilot/product-optimizer.ts`

```
1. Verification HMAC
2. Journalisation webhook_events (status='received')
3. Reponse 200 immediate
4. after() :
   a. getValidAccessToken() — refresh si necessaire
   b. optimizeProduct(store, productId, supabase) :
      i.   GET /products/{id}.json (produit complet)
      ii.  GET /products.json?limit=30 (autres produits pour cross-sell)
      iii. getProductSeoMeta() (backup SEO actuel)
      iv.  Claude claude-opus-4-8 :
           - Genere metaTitle (50-60 chars)
           - Genere metaDescription (150-160 chars)
           - Genere altTexts (1 par image)
           - Genere crossSell (3 produits complementaires)
      v.   updateProductMetafields() (titre + description Google)
      vi.  updateProductImageAlt() (pour chaque image)
      vii. setProductMetafield('modify', 'cross_sell', JSON) (cross-sell)
      viii.setProductMetafield('modify', 'seo_applied', JSON) (empreinte + timestamp)
      ix.  logAction('autopilot_product_optimized')
   c. Mise a jour webhook_events (status='optimized')
```

### products/update — Detection regression + garde anti-boucle

**Fichier** : `app/api/webhooks/products/update/route.ts` + `lib/autopilot/regression.ts`

```
1. ingestWebhook() — HMAC + journalisation
2. after() :
   a. getValidAccessToken()
   b. checkAndRestore(store, productId) :
      i.   Lit metafield modify.seo_applied (empreinte Modify)
      ii.  Si empreinte absente → "jamais optimise" → STOP
      iii. Si timestamp < 90 secondes → "echo de notre ecriture" → STOP
      iv.  Lit SEO actuel via getProductSeoMeta()
      v.   Compare title_tag et description_tag
      vi.  Si regression detectee → updateProductMetafields() pour restaurer
      vii. logAction('autopilot_regression_restored')
```

**Garde anti-boucle** : `SELF_WRITE_WINDOW_MS = 90_000` (90 secondes). Tout `products/update` recu moins de 90s apres notre propre ecriture est ignore.

### themes/publish — Reinstallation App Blocks

**Fichier** : `app/api/webhooks/themes/publish/route.ts` + `lib/autopilot/theme-reinstall.ts`

```
1. ingestWebhook()
2. after() :
   a. getValidAccessToken()
   b. reinstallAppBlocks(store, supabase) :
      i.   getThemes() → trouve le theme principal (role='main')
      ii.  Liste tous les fixes 'applied' du store
      iii. Pour chaque fix avec un App Block (appBlockForFix()) :
           → enableProductAppBlock() sur le nouveau theme
      iv.  logAction('autopilot_theme_reinstalled')
```

### orders/paid — Alimentation product_performance

**Fichier** : `app/api/webhooks/orders/paid/route.ts` + `lib/autopilot/order-performance.ts`

```
1. ingestWebhook() — payload reduit (id, total_price, product_ids — sans PII)
2. after() :
   a. recordOrderPerformance(store, payload) :
      i.   Extrait les line_items (product_id, quantity, price)
      ii.  Agrege par produit (une commande peut avoir plusieurs lignes du meme produit)
      iii. Upsert product_performance :
           orders_count += qty
           revenue_total += revenue
           conversion_rate = orders / views (si views > 0)
```

### Crons

Definis dans **`vercel.json`** :

| Cron | Frequence | Ce qu'il fait | Tables alimentees |
|------|-----------|---------------|-------------------|
| `sync-conversions` | Quotidien 3h | Synchro conversions Shopify → Supabase | `conversions` |
| `optimize-images` | Lundi 3h | Compression images produit (Sharp) | `image_optimizations` |
| `blog-articles` | Mardi 4h | Generation article blog SEO (Claude) | `blog_articles` + Shopify Blog |
| `weekly-report` | Lundi 8h | Envoi rapport hebdo par email | Email (Resend) |
| `winning-products` | Quotidien 6h | Detection produits gagnants (Claude + web_search) | `winning_products` |
| `monthly-report` | 1er du mois 9h | Envoi bilan mensuel par email | Email (Resend) |
| `competitor-monitor` | 1er du mois 5h | Veille concurrentielle (Claude + web_search) | `competitor_alerts` |
| `trend-predict` | 15 du mois 5h | Predictions tendances marche | `trend_predictions` |
| `price-suggest` | 2 du mois 5h | Suggestions de prix (jamais appliquees automatiquement) | Journalisation uniquement |

---

## 7. Mody Copilot

### Comment le panel s'ouvre

**Fichier** : `lib/mody-companion.ts` + `components/dashboard/ModyCompanion.tsx`

Le compagnon Mody est **monte dans le layout dashboard** (persiste entre les pages).

Deux points d'entree :
1. **Bouton flottant** (en bas a droite) → ouvre la liste des missions
2. **Evenement global** `mody:open` → ouvre directement sur une mission specifique

```typescript
// N'importe quel composant peut ouvrir Mody :
import { openMody } from '@/lib/mody-companion'
openMody('Titre du probleme')  // ouvre sur cette mission
```

L'evenement est un `CustomEvent<ModyOpenDetail>` dispatche sur `window`. Le composant `ModyCompanion` ecoute cet evenement.

**Deep-link** : `?mody=1` dans l'URL ouvre automatiquement le panel.

### Les 4 metiers et 6 types de missions

**Fichier** : `lib/copilot/mission-types.ts`

#### 4 metiers

| Metier | Emoji | Label | Description |
|--------|-------|-------|-------------|
| `contenu` | 🖋 | Contenu | Descriptions, pages, FAQ — textes prets a coller |
| `reputation` | ⭐ | Reputation | Avis clients, SAV, reponses — emails prets a envoyer |
| `video_social` | 🎬 | Video & Social | Scripts video, briefs photo, idees reseaux |
| `strategie` | 📊 | Strategie | Plans d'action bases sur l'analyse concurrentielle |

#### 6 types de missions

| Type | Emoji | Metier | Ce que le Copilot genere |
|------|-------|--------|--------------------------|
| `photos` | 📸 | video_social | Brief photo detaille par produit (angles, lumiere, mise en scene) |
| `avis` | ⭐ | reputation | Sequence de 3 emails post-achat + reponses aux avis negatifs |
| `videos` | 🎥 | video_social | Script complet par produit (hook, demo, CTA) — 30-60s |
| `contenu` | 📝 | contenu | Texte complet pret a coller (A propos, FAQ, descriptions) |
| `strategie` | 🏆 | strategie | Plan d'action priorise en 3-5 actions concretes avec echeances |
| `sav` | 💬 | reputation | Bibliotheque de reponses types personnalisees |

**Mapping probleme → mission** (`missionTypeForProblem()`) :
- Categorie `competitive` → toujours `strategie`
- Regex sur titre + description + recommendation :
  - `photo|image|visuel` → `photos`
  - `avis|review|temoignage` → `avis`
  - `video|demonstration` → `videos`
  - `sav|service client|reclamation` → `sav`
  - `livraison gratuite|prix|concurrent|fidelite` → `strategie`
  - Tout le reste → `contenu`

### Appels API Anthropic (Copilot)

**Fichier** : `lib/copilot/mission-runner.ts`

| Parametre | Valeur |
|-----------|--------|
| **Modele** | `claude-opus-4-8` |
| **Max tokens** | 4096 |

Chaque type a son prompt specialise (`GENERATORS[type]`) qui inclut :
- Le contexte reel de la boutique (nom, niche, produits concernes)
- Le probleme exact detecte par l'audit
- Les liens admin Shopify directs (`https://admin.shopify.com/store/{handle}/...`)
- Des instructions precises sur le livrable attendu

**Format de sortie** :
```json
{
  "title": "Titre court de la mission",
  "summary": "1-2 phrases liees au probleme",
  "steps": [
    { "title": "Etape — titre court", "detail": "CONTENU COMPLET pret a utiliser" }
  ]
}
```

### Gate Pro

**Fichier** : `app/api/agent/chat/route.ts`

Le chat Mody est limite pour les plans Free/Starter :
- **Free/Starter** : 3 messages utilisateur max (`PREVIEW_USER_MESSAGES = 3`)
- **Pro/Agency** : illimite
- **Admin** : toujours illimite (`isAdmin(userId)`)

Au-dela du quota, reponse HTTP 402 avec `code: 'UPGRADE_REQUIRED'`.

### Bandeau suggestion proactive

**Fichier** : `components/dashboard/ModyBanner.tsx`

Le bandeau s'affiche sous le hero du tableau de bord. Il :
1. Fetch `GET /api/copilot/missions` (sans LLM, juste lecture Supabase)
2. Filtre les missions pas encore `done`
3. Trie par priorite (🔴 high → 🟠 medium → 🟡 low) puis par `impact_euros` decroissant
4. Affiche la mission #1 comme teaser : "Mody a une suggestion : [titre] — je peux preparer [livrable]."
5. Clic → `openMody(mission.problem_title)` → ouvre le panel sur cette mission

**Etats honnetes** :
- Tout lance : "Mody a tout lance — rien a preparer pour l'instant 👍"
- Aucune mission : "Mody est pret a t'aider des qu'il y aura quelque chose a faire."

---

## 8. Stripe

### Creation checkout session

**Fichier** : `lib/stripe.ts` — `createCheckoutSession()`

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  customer_email: email,
  line_items: [{ price: p.stripePriceId, quantity: 1 }],
  subscription_data: {
    trial_period_days: 14,  // TRIAL_DAYS
    metadata: { user_id: userId, plan }
  },
  metadata: { user_id: userId, plan },
  success_url: `${APP_URL}/dashboard?success=true`,
  cancel_url: `${APP_URL}/dashboard?canceled=true`,
})
```

**Endpoint** : `POST /api/stripe/checkout` — appele depuis `components/dashboard/SubscribeButton.tsx`

### Webhook Stripe

**Fichier** : `app/api/stripe/webhook/route.ts`

| Evenement | Action |
|-----------|--------|
| `checkout.session.completed` | Cree/met a jour `subscriptions` (upsert sur `user_id`). Persiste `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`, `trial_end`, `plan` |
| `customer.subscription.updated` | Met a jour `status`, `current_period_end`, `trial_end`, `plan` |
| `customer.subscription.deleted` | Passe `status = 'canceled'` |
| `invoice.payment_failed` | Passe `status = 'past_due'` |

### Acces apres paiement

L'acces est gere via la table Supabase `subscriptions`, **pas via Clerk metadata**.

**`lib/subscription.ts`** :
- `hasActiveAccess()` : retourne `true` si `status` est `active` ou `trialing`
- `planFor()` : resout le tier effectif — `free`, `starter`, ou `pro` (agency → pro pour le gating)

### Plans et price IDs

**Fichier** : `lib/pricing.ts`

| Plan | Prix | Stripe Price ID | Fonctionnalites |
|------|------|-----------------|-----------------|
| **Gratuit** | 0 EUR | — | 2-3 problemes visibles, apercu produits gagnants |
| **Starter** | 19 EUR/mois | `price_1TjAQCCqFoSohAzu5OvgKZ0Y` | Analyse complete hebdo, 5 produits gagnants/semaine, SEO basique |
| **Pro** | 49 EUR/mois | `price_1TjARHCqFoSohAzuZP2l0M7V` | Tout automatique, correctifs hebdo, agent Mody illimite, articles blog |
| **Agency** | 149 EUR/mois | `price_1TjAS7CqFoSohAzuK3bH1GBo` | Multi-boutique, veille concurrentielle, predictions, suggestions prix |

**Essai gratuit** : 14 jours (`TRIAL_DAYS = 14`)

---

## 9. Supabase

### Toutes les tables

#### `stores`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | Identifiant unique |
| `user_id` | text NOT NULL | ID Clerk de l'utilisateur |
| `shop_domain` | text NOT NULL UNIQUE | Domaine Shopify (xxx.myshopify.com) |
| `access_token` | text NOT NULL | Token d'acces Shopify |
| `shop_name` | text | Nom de la boutique |
| `plan` | text | Plan Shopify (Basic, Shopify, Advanced) |
| `mode` | text DEFAULT 'auto' | Mode automatisation ('auto' ou 'approval') |
| `backup_theme_id` | text | ID du theme de backup actuel |
| `backup_created_at` | timestamptz | Date de creation du backup |
| `token_expires_at` | timestamptz | Expiration du token (null = permanent) |
| `refresh_token` | text | Refresh token (tokens expirants) |
| `created_at` | timestamptz | Date de creation |

#### `audits`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `status` | text CHECK | 'pending', 'running', 'completed', 'failed' |
| `results` | jsonb | Tableau de Problem (voir types.ts) |
| `total_impact_euros` | numeric(10,2) | Somme des impact_euros |
| `created_at` | timestamptz | |

#### `fixes`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `audit_id` | uuid FK → audits | |
| `type` | text | Categorie du probleme |
| `title` | text | Titre du correctif |
| `description` | text | Description |
| `impact_euros` | numeric(10,2) | Impact estime |
| `status` | text CHECK | 'pending', 'applied', 'rolled_back', 'failed', 'preview' |
| `liquid_before` | text | Ancre Liquid (avant) |
| `liquid_after` | text | Code Liquid injecte (apres) |
| `file_path` | text | Chemin du fichier theme modifie |
| `theme_id` | text | ID du theme modifie |
| `backup_theme_id` | text | ID du theme de backup |
| `original_file_content` | text | Contenu original (backup) / JSON Group A backup |
| `risk_group` | text | 'a', 'b', ou 'c' |
| `verification_status` | text | 'pending', 'verified', 'failed' |
| `preview_theme_id` | text | ID du theme preview (Groupe C) |
| `screenshot_before` | text | URL screenshot avant |
| `screenshot_after` | text | URL screenshot apres |
| `created_at` | timestamptz | |

#### `subscriptions`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `user_id` | text NOT NULL UNIQUE | ID Clerk |
| `stripe_customer_id` | text | ID client Stripe |
| `stripe_subscription_id` | text | ID abonnement Stripe |
| `status` | text CHECK | 'active', 'trialing', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid' |
| `plan` | text CHECK | 'free', 'starter', 'pro' |
| `current_period_end` | timestamptz | Fin de periode |
| `trial_end` | timestamptz | Fin d'essai |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `conversions`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `date` | date | Date du jour |
| `conversion_rate` | numeric(8,6) | Taux de conversion |
| `revenue` | numeric(12,2) | CA du jour |
| `sessions` | integer | Sessions du jour |
| UNIQUE | (store_id, date) | |

#### `audit_logs`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores (nullable) | |
| `fix_id` | uuid FK → fixes (nullable) | |
| `action` | text NOT NULL | Type d'action (voir ci-dessous) |
| `details` | jsonb | Donnees contextuelles |
| `status` | text CHECK | 'success', 'failed', 'warning' |
| `created_at` | timestamptz | |

Actions principales : `audit_started`, `audit_category_done`, `audit_completed`, `audit_agent_failed`, `audit_strengths`, `audit_module_checks`, `audit_watchdog_kick`, `fix_applied`, `fix_rolled_back`, `fix_backup_saved`, `mission_created`, `autopilot_product_optimized`, `autopilot_regression_restored`, `autopilot_theme_reinstalled`

#### `image_optimizations`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `product_id` | bigint | |
| `old_image_id` / `new_image_id` | bigint | |
| `original_bytes` / `new_bytes` / `saved_bytes` | integer | |
| `created_at` | timestamptz | |

#### `pagespeed_scores`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `audit_id` | uuid FK → audits (nullable) | |
| `strategy` | text CHECK | 'mobile', 'desktop' |
| `tested_url` | text | |
| `score` | integer | 0-100 |
| `lcp_ms`, `cls`, `tbt_ms`, `fcp_ms`, `speed_index_ms`, `tti_ms` | integer/numeric | |
| `opportunities` | jsonb | |
| `created_at` | timestamptz | |

#### `blog_articles`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `blog_id` | bigint | ID du blog Shopify |
| `article_id` | bigint | ID de l'article Shopify |
| `title` | text | |
| `handle` | text | |
| `url` | text | |
| `tags` | text | |
| `created_at` | timestamptz | |

#### `store_score_snapshots`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `score` | integer | 0-100 |
| `recovered_euros` | numeric(12,2) | |
| `potential_euros` | numeric(12,2) | |
| `components` | jsonb | {speed, content, fixes, seo} |
| `created_at` | timestamptz | |

#### `product_promos`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `product_id` | bigint | |
| `variant_id` | bigint | |
| `original_price` / `new_price` | numeric(12,2) | |
| `original_compare_at` / `new_compare_at` | numeric(12,2) | |
| `status` | text CHECK | 'active', 'reverted' |
| `created_at` | timestamptz | |
| `reverted_at` | timestamptz | |

#### `guides`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `type` | text CHECK | 'photos', 'theme_ux', 'marketing', 'products', 'avis', 'videos', 'sav' |
| `title` | text | |
| `impact_euros` | numeric(10,2) | |
| `summary` | text | |
| `steps` | jsonb | Tableau de {title, detail, done?} |
| `status` | text CHECK | 'todo', 'done' |
| `created_at` | timestamptz | |
| `completed_at` | timestamptz | |

#### `winning_products`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `name` | text | Nom du produit |
| `why` | text | Raison (francais simple) |
| `recommended_price_eur` | numeric | Prix de vente conseille |
| `margin_pct` | integer | Marge estimee % |
| `score` | text CHECK | 'fire', 'good', 'watch' |
| `category` | text | Niche / categorie |
| `sources` | text[] | ex: ['Google','TikTok','Amazon'] |
| `created_at` | timestamptz | |

#### `webhook_events` (migration 019)
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `event_type` | text | products/create, products/update, themes/publish, orders/paid |
| `shopify_id` | text | ID ressource Shopify |
| `payload` | jsonb | Payload reduit (sans PII) |
| `processed_at` | timestamptz | null = non traite |
| `result` | jsonb | Resultat du traitement |
| `created_at` | timestamptz | |

#### `product_performance` (migration 019)
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `product_id` | text | |
| `views_count` | integer | |
| `orders_count` | integer | |
| `conversion_rate` | numeric(5,4) | |
| `revenue_total` | numeric(10,2) | |
| `last_updated` | timestamptz | |
| UNIQUE | (store_id, product_id) | |

#### `competitor_alerts` (migration 019)
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `competitor_url` | text | |
| `alert_type` | text | price_change, new_product, shipping_change |
| `severity` | text CHECK | 'urgent', 'important', 'info' |
| `old_value` / `new_value` | text | |
| `impact_assessment` | text | |
| `actioned_at` | timestamptz | |
| `created_at` | timestamptz | |

#### `trend_predictions` (migration 019)
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `store_id` | uuid FK → stores | |
| `keyword` | text | |
| `current_volume` / `predicted_volume` | integer | |
| `prediction_date` | date | |
| `confidence_score` | numeric(3,2) | |
| `recommended_action` | text | |
| `created_at` | timestamptz | |

### Relations entre tables

```
stores ──┬── audits ──── fixes
         ├── conversions
         ├── audit_logs
         ├── image_optimizations
         ├── pagespeed_scores
         ├── blog_articles
         ├── store_score_snapshots
         ├── product_promos
         ├── guides
         ├── winning_products
         ├── webhook_events
         ├── product_performance
         ├── competitor_alerts
         └── trend_predictions

subscriptions (lie a user_id, pas a store_id)
```

### Migrations 001 a 019

| Migration | Ce qu'elle ajoute |
|-----------|-------------------|
| **001** | Colonne `original_file_content` sur `fixes` (rollback fiable) |
| **002** | Table `subscriptions` (Stripe billing) |
| **003** | Colonnes backup sur `stores`, `risk_group`/`verification_status`/`preview_theme_id` sur `fixes`, table `audit_logs` |
| **004** | Correction : fixes product/description → risk_group 'a' |
| **005** | Politique INSERT sur `audit_logs` |
| **006** | Reparation colonnes manquantes `action`/`fix_id` sur `audit_logs` (table pre-existante) |
| **007** | Table `image_optimizations` |
| **008** | Table `pagespeed_scores` |
| **009** | Table `blog_articles` |
| **010** | Table `store_score_snapshots` |
| **011** | Table `product_promos` |
| **012** | Table `guides` |
| **013** | Colonne `token_expires_at` sur `stores` |
| **014** | Colonne `refresh_token` sur `stores` |
| **015** | Colonne `mode` sur `stores` ('auto'/'approval') |
| **016** | Colonne `plan` sur `subscriptions` ('free'/'starter'/'pro') |
| **017** | Table `winning_products` |
| **018** | Colonnes `screenshot_before`/`screenshot_after` sur `fixes` |
| **019** | Tables `webhook_events`, `product_performance`, `competitor_alerts`, `trend_predictions` |

### Politiques RLS

Toutes les tables ont RLS active. Pattern general :

- **SELECT** : `user_id = auth.uid()::text` (direct) ou jointure `stores.user_id = auth.uid()::text` (indirect)
- **INSERT** (tables server-only) : `WITH CHECK (true)` — les crons et API routes utilisent le service role
- **Service role bypass** : `USING (true) WITH CHECK (true)` sur `stores`

---

## 10. Clerk Auth

### Comment l'auth est geree

**Fichier** : `middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})
```

**Routes protegees** : tout ce qui commence par `/dashboard`

**Routes exclues du middleware** :
- `/shopify` (surface embedded — Clerk casserait le handshake dans l'iframe Shopify admin)
- Assets statiques (`_next`, `.html`, `.css`, `.js`, images, fonts, etc.)

**Layout site** (`app/(site)/layout.tsx`) : wrappe tout dans `<ClerkProvider>`. Les composants Clerk (`SignIn`, `SignUp`, `UserButton`) sont utilises directement.

### Admin bypass

**Fichier** : `lib/config.ts`

```typescript
export const ADMIN_USER_IDS = ['user_3EY7Xb5pBY6UUFxJU4cZCclp0Qv']

export function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId)
}
```

L'admin bypass est utilise pour :
- Chat Mody illimite sans abonnement Pro
- Acces complet au dashboard sans restrictions de plan
- Verification dans `app/api/agent/chat/route.ts` : `const isPro = isAdmin(userId) || planFor(...) === 'pro'`

---

## 11. Resend

### Emails envoyes

**Fichier** : `lib/email.ts`

| Email | Quand | Destinataire | Sujet |
|-------|-------|-------------|-------|
| **Rapport hebdomadaire** | Lundi 8h (cron `weekly-report`) | Email du marchand (Clerk) | `📈 [boutique] — €X recuperes cette semaine` |
| **Rapport mensuel** | 1er du mois 9h (cron `monthly-report`) | Email du marchand | `📊 [boutique] — votre bilan du mois (€X recuperes)` |
| **Email d'approbation** | Lundi (mode 'approval') | Email du marchand | `✋ [boutique] — X amelioration(s) a approuver` |

### Templates

Tous les templates sont du **HTML inline** (pas de fichiers separes). Ils utilisent :
- Style inline pour compatibilite email
- Couleur d'accent : `#FF5C35` (orange Modify dans les emails)
- Structure : header colore + tableau de metriques + CTA central + footer

**Rapport hebdomadaire** (`renderWeeklyReportHtml()`) :
- Header : montant recupere cette semaine (gros chiffre)
- Liste des correctifs appliques avec gains en EUR
- Metriques : total mois, images allegees, articles publies, potentiel restant
- CTA : "Voir le rapport complet"

**Rapport mensuel** (`renderMonthlyReportHtml()`) :
- Header : montant recupere ce mois
- Liste correctifs + score boutique
- Preuves d'impact (avant/apres reels)
- Insights du mois (veille concurrentielle + tendances)
- Potentiel restant a gagner

**Email d'approbation** (`renderApprovalEmailHtml()`) :
- Liste des corrections pretes avec gains
- Gros bouton vert "Tout approuver en 1 clic"
- Lien vers le dashboard pour choisir individuellement

**Expediteur** : `Modify <contact@modifea.com>` (configurable via `EMAIL_FROM`)

---

## 12. Vercel

### Contraintes Hobby plan

Le code est explicitement concu pour le plan Hobby (60s timeout) :

1. **Pattern auto-chaine `after()`** : Chaque etape d'audit prend ~20-30s (collecte 5s + LLM 20-30s), bien sous les 60s. La progression est suivie via `audit_logs`.

2. **Fallback inline** : Si le chainage HTTP echoue (Vercel 508 "loop detected" apres plusieurs tentatives), le code bascule en execution sequentielle dans le `maxDuration` (jusqu'a 300s si plan Pro).

3. **Webhooks** : Reponse 200 immediate, traitement dans `after()`. Le `maxDuration = 60` est explicitement declare.

### Pattern auto-chaine after()

Utilise dans :
- `app/api/audit/start/route.ts` → lance le premier step
- `app/api/audit/step/route.ts` → chaine le step suivant
- `app/api/fixes/apply/route.ts` → application en arriere-plan
- `app/api/webhooks/*/route.ts` → traitement asynchrone

```typescript
import { after } from 'next/server'

// Reponse immediate
return NextResponse.json({ received: true })

// Traitement en arriere-plan (apres envoi de la reponse)
after(async () => {
  // Logique longue ici (< 60s)
})
```

### Variables d'env configurees

Voir la section [Variables d'environnement](#variables-denvironnement) ci-dessus. Toutes sont configurees dans le dashboard Vercel.

---

## 13. Design System

### Variables CSS completes

**Fichier** : `app/globals.css`

#### Mode clair (`:root`)

| Variable | Valeur RGB | Hex | Usage |
|----------|-----------|-----|-------|
| `--bg-base` | 248 250 252 | #F8FAFC | Fond de page |
| `--bg-card` | 255 255 255 | #FFFFFF | Surface des cartes |
| `--bg-surface-2` | 241 245 249 | #F1F5F9 | Surface secondaire |
| `--border-color` | 226 232 240 | #E2E8F0 | Bordures |
| `--text-primary` | 30 41 59 | #1E293B | Texte principal |
| `--text-secondary` | 100 116 139 | #64748B | Texte secondaire |
| `--text-muted` | 148 163 184 | #94A3B8 | Texte attenue |

#### Mode sombre (`.dark`)

| Variable | Valeur RGB | Hex |
|----------|-----------|-----|
| `--bg-base` | 8 11 20 | #080B14 |
| `--bg-card` | 15 20 36 | #0F1424 |
| `--bg-surface-2` | 26 32 53 | #1A2035 |
| `--border-color` | 28 36 64 | #1C2440 |
| `--text-primary` | 232 234 237 | #E8EAED |
| `--text-secondary` | 136 146 164 | #8892A4 |
| `--text-muted` | 82 95 114 | #525F72 |

#### Couleurs invariantes

| Variable / Token | Valeur | Usage |
|------------------|--------|-------|
| `--modify-primary` | #8B7BFF | Couleur identitaire Modify (violet) |
| `--mody-accent` | #10B981 | Couleur Mody (emeraude) — EXCLUSIVEMENT pour Mody |
| `--color-danger` | #EF4444 | Erreurs, suppressions |
| `--color-success` | #22C55E | Succes, validation |

### Composants reutilisables

**`components/ui/Button.tsx`** :
- Variantes : `primary` (violet), `secondary` (surface), `ghost` (transparent), `danger` (rouge)
- Tailles : `sm`, `md`, `lg`
- Etat loading avec animation

**`components/ui/Card.tsx`** :
- Surface avec bordure, border-radius 16px
- Props optionnels `glow` (halo violet) et `hoverable`

**`components/ui/Badge.tsx`** :
- 11 variantes de couleur (high, medium, low, applied, pending, etc.)
- Utilise pour les priorites, statuts de correctifs, etats d'audit

**`components/ui/Progress.tsx`** :
- Barre de progression lineaire 0-100
- `barClassName` personnalisable

### Systeme de theme dark/light

**Implementation technique** :

1. **`app/layout.tsx`** : Script inline avant le premier rendu qui lit `localStorage.modifyTheme` ou `prefers-color-scheme` et applique `.dark` sur `<html>`
2. **`components/ThemeToggle.tsx`** : Bouton soleil/lune qui bascule la classe `.dark` et persiste dans `localStorage`
3. **`tailwind.config.ts`** : `darkMode: 'class'` — toutes les classes Tailwind avec `dark:` prefix
4. **`globals.css`** : Transition douce `background-color 0.2s, color 0.2s` sur `body`
5. **Accessibilite** : `@media (prefers-reduced-motion: reduce)` desactive toutes les animations

**Couleurs Tailwind** (dans `tailwind.config.ts`) :

```typescript
colors: {
  background: 'rgb(var(--bg-base) / <alpha-value>)',
  surface: 'rgb(var(--bg-card) / <alpha-value>)',
  'surface-2': 'rgb(var(--bg-surface-2) / <alpha-value>)',
  border: 'rgb(var(--border-color) / <alpha-value>)',
  'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
  'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
  'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
  primary: '#8B7BFF',
  'primary-dark': '#6D5FE8',
  'primary-bright': '#A99BFF',
  'primary-glow': 'rgba(139, 123, 255, 0.16)',
  mody: '#10B981',
  'mody-dark': '#059669',
  'mody-bright': '#34D399',
  'mody-glow': 'rgba(16, 185, 129, 0.16)',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
}
```

**Polices** :
- `font-sans` : Inter (corps de texte)
- `font-syne` : Syne / Space Grotesk (titres, gros chiffres)

**Animations** :
- `fade-up` : entree de bas en haut (0.5s)
- `proof-reveal` : revelation d'une preuve (0.55s cubic-bezier)
- `strike` + `price-reveal` : animation prix barre (0.4s + 0.65s)
- `card-enter` : entree echelonnee des cartes (0.3s)
- `pulse-glow` : pulsation Mody (2.5s infini)
- `float-slow` : derive lente particules (10s infini)
- `score-draw` : dessin circulaire du score (1s)

**Utilities CSS** :
- `.text-gradient` : degradee violet sur texte
- `.glow-primary` / `.glow-primary-sm` : halo violet
- `.glass` : effet verre depoli (backdrop-filter blur 12px)
- `.border-gradient` : bordure degradee
- `.animate-fade-up` : animation d'entree

---

## 14. Graphify

### Configuration

**Fichiers** :
- `modify/CLAUDE.md` : instructions pour utiliser graphify
- `modify/graphify-out/` : sortie du knowledge graph
- `modify/.claude/settings.json` : hook pre-tool qui rappelle d'utiliser graphify

Le knowledge graph est genere par le projet frere `/Users/bendou/Modify.io/graphify/` (projet Python open-source).

### Sortie

- `graphify-out/graph.json` : graphe complet (noeuds, aretes, communautes)
- `graphify-out/GRAPH_REPORT.md` : rapport d'architecture large
- `graphify-out/manifest.json` : metadonnees du build
- `graphify-out/cache/` : cache AST et semantique

### Utilisation efficace

```bash
# Question ciblee (retourne un sous-graphe pertinent)
graphify query "comment fonctionne l'audit"

# Relation entre deux concepts
graphify path "shopify-token" "audit-orchestrator"

# Explication d'un concept
graphify explain "fix-pipeline"

# Mise a jour apres modification du code (AST only, pas d'API)
graphify update .
```

**Regles** :
- Toujours `graphify query` en premier pour les questions codebase
- `GRAPH_REPORT.md` uniquement pour une vue d'architecture large
- `graphify update .` apres chaque modification du code

---

## 15. Points d'attention / Pieges connus

### Bugs resolus et pourquoi ils existaient

| Bug | Cause | Resolution | Fichier |
|-----|-------|------------|---------|
| **Migration 003 no-op** | `CREATE TABLE IF NOT EXISTS audit_logs` sur une table pre-existante → colonnes `action` et `fix_id` jamais ajoutees | Migration 006 ajoute les colonnes manquantes avec `ALTER TABLE ADD COLUMN IF NOT EXISTS` | `supabase/migrations/006_fix_audit_logs_columns.sql` |
| **Fixes produit classees B/C** | Descriptions produit incorrectement classees comme Liquid patches | Migration 004 corrige en masse `risk_group → 'a'` | `supabase/migrations/004_fix_description_risk_group.sql` |
| **Mody button overlap** | Le bouton flottant Mody masque le contenu en bas de page | `pb-20` (80px) sur le conteneur principal | `app/(site)/dashboard/layout.tsx` |
| **Vercel 508 loop detection** | Le chainage HTTP audit/step → audit/step declenche la detection de boucle Vercel apres plusieurs iterations | Fallback en execution sequentielle inline si HTTP echoue 2 fois | `app/api/audit/step/route.ts` |

### Limitations Shopify API

| Limitation | Impact | Contournement |
|------------|--------|---------------|
| **write_themes restreint** | Depuis 2024, le REST Asset PUT retourne 404/403 sans exemption theme-files de Shopify. `write_themes` seul ne suffit plus. | Erreur specifique `ThemeWriteForbiddenError` surfacee proprement. Fallback vers App Blocks quand possible. |
| **Theme Blocks incompatibles** | Les themes type Horizon utilisent des `presets` referençant des block types sous `/blocks/`. Le REST Assets API re-valide le schema en isolation et rejette l'ecriture (422). | Erreur specifique `ThemeBlocksIncompatibleError`. Utilisation des App Blocks JSON via `templates/product.json` a la place. |
| **App Blocks silencieusement supprimes** | Shopify supprime sans erreur les references de blocs qu'il ne peut pas resoudre (mauvais handle, UUID, extension non deployee). | Verification post-ecriture : relecture du template pour confirmer que le bloc a survecu. |
| **Pagination commandes** | Limite 250 commandes par requete. | Suffisant pour la plupart des cas (CA mensuel, best-sellers 90j). |

### Ce qui ne doit jamais etre modifie sans precaution

1. **`lib/audit/checks.ts`** : Source unique des points de controle. Ajouter un check l'injecte automatiquement dans le prompt ET le comptage. Le nombre total est affiche sur la page Analyse.

2. **`lib/pricing.ts`** : Source unique des plans et prix. Utilise par la landing, le dashboard, les gates, et le checkout Stripe. Les `stripePriceId` correspondent a des prix reels dans Stripe.

3. **`SHOPIFY_THEME_EXTENSION_UUID`** : Doit correspondre a l'extension deployee sur l'app installee. Un UUID incorrect = les App Blocks sont silencieusement supprimes par Shopify.

4. **`ADMIN_USER_IDS` dans `lib/config.ts`** : Bypass complet de l'auth et des plans. Ne jamais ajouter un ID sans verification.

5. **Garde anti-boucle 90s** (`lib/autopilot/regression.ts`) : Le `SELF_WRITE_WINDOW_MS` empeche une boucle infinie webhook. Le reduire pourrait creer un cycle products/update → restore → products/update.

6. **`verifyWebhookHmac()`** : Securise tous les webhooks Shopify. Utilise `timingSafeEqual` pour eviter les attaques timing.

7. **`parseTokenResponse()`** : Gere les deux types de tokens Shopify (expirants et permanents). Les tokens offline n'ont pas de `expires_in` — c'est normal, pas un bug.

8. **Tables Supabase avec RLS** : Toutes les tables ont Row Level Security. Les API routes utilisent le service role (`SUPABASE_SERVICE_ROLE_KEY`) pour bypass RLS. Sans cette cle, rien ne fonctionne cote serveur.
