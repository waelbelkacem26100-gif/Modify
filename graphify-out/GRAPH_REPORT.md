# Graph Report - modify  (2026-06-17)

## Corpus Check
- 249 files · ~114,682 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1187 nodes · 2585 edges · 93 communities (79 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb11cb4a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 100|Community 100]]

## God Nodes (most connected - your core abstractions)
1. `createServiceRoleClient()` - 132 edges
2. `Store` - 82 edges
3. `logAction()` - 55 edges
4. `getProductsDetailed()` - 39 edges
5. `shopifyHeaders()` - 30 edges
6. `getThemes()` - 28 edges
7. `getUserSubscription()` - 28 edges
8. `isAdmin()` - 21 edges
9. `getThemeAsset()` - 20 edges
10. `PATCH()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Migration to New Shopify App` --conceptually_related_to--> `App Icon`  [INFERRED]
  MIGRATION_NEW_APP.md → app/icon.svg
- `PilotePage()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/(site)/dashboard/pilote/page.tsx → lib/supabase-server.ts
- `GET()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/api/blog/generate/route.ts → lib/supabase-server.ts
- `POST()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/api/blog/generate/route.ts → lib/supabase-server.ts
- `GET()` --calls--> `createServiceRoleClient()`  [EXTRACTED]
  app/api/cron/blog-articles/route.ts → lib/supabase-server.ts

## Import Cycles
- None detected.

## Communities (93 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.34
Nodes (12): AccompagnementPage(), POST(), DashboardLayout(), DashboardPage(), POST(), ADMIN_USER_IDS, isAdmin(), getUserSubscription() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.24
Nodes (8): categoryPresentation(), euros(), ProofCard(), relativeDate(), ApiResponse, ProofRecord, ProofSide, ProofType

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (68): anthropic, competitiveAgent, funnelAgent, mobileAgent, performanceSeoAgent, productPagesAgent, anthropic, AuditAgent (+60 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (45): GET(), page(), runFullAuditSequential(), applyPendingFixesForStore(), getPendingFixes(), PendingFix, SupabaseClient, ApprovalEmailData (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (7): categories, QA, steps, breakdown, max, stats, total

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (33): dependencies, @anthropic-ai/sdk, @clerk/nextjs, lucide-react, next, react, react-dom, recharts (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (28): POST(), GET(), getStore(), POST(), GET(), getStore(), PATCH(), POST() (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (24): GET(), buildInstallUrl(), duplicateTheme(), getBlogs(), getOrCreateBlog(), getOrdersForDateRange(), getProductWithImages(), isThemeBlocksRejection() (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): Anti-patterns à éviter, Ce qui existe déjà (v6, implémenté), Contraste WCAG — règle d'usage des couleurs Mody (vérifié v6), Mody — notes de direction de marque (réflexion, NON implémenté), Pistes pour la mascotte complète (à explorer), Prochaine session suggérée

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (10): POST(), ORDER, isPaidPlan(), PaidPlanId, Plan, PLANS, createCheckoutSession(), stripe (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (45): GET(), Alert, monitorCompetitors(), SupabaseClient, PriceSuggestion, suggestPrices(), SupabaseClient, predictTrends() (+37 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (28): anthropic, hdr(), OptimizationOutput, optimizeProduct(), OptimizeReport, ProductImage, ShopifyProductFull, SupabaseClient (+20 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (18): POST(), POST(), POST(), GET(), ConnectPage(), POST(), POST(), DELETE() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (12): GET(), getStore(), POST(), compressFromUrl(), CompressResult, headImageSize(), optimizeStoreImages(), OptimizeSummary (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (10): reinstallAppBlocks(), SupabaseClient, appBlockForFix(), AppBlockSpec, enableProductAppBlock(), EnableResult, getAppHandle(), isProductSection() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (13): generateMissionContent(), MISSION_TO_GUIDE_TYPE, missionTypeForProblem(), guideProblems(), GuideRow, latestCompletedAudit(), listMissions(), Mission (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): 1. Créer + lier la nouvelle app (CLI — recommandé), 2. Vérifier `shopify.app.toml` après le link, 3. Récupérer les nouvelles clés, 4. Mettre à jour les variables d'env, 5. Pousser la config vers la nouvelle app, 6. Redéployer Vercel, 7. Installer la nouvelle app sur la boutique de test, 8. Vérifier (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.05
Nodes (28): ActivePromo, Bundle, BundleProduct, Candidate, ErrorProps, RunResult, Stats, GeneratedContent (+20 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (33): 10. Bugs Potentiels, 1. Routes & API, 2. Composants, 3. Libs, 4. Crons, 5. Webhooks, 6. Variables d'Environnement, 7. Dépendances (+25 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (13): FixPanelProps, beforeAfter(), CATEGORY_PRESENTATION, MODE_PRESENTATION, PRIORITY_PRESENTATION, priorityPresentation(), AuditLog, AuditResult (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (12): ConversionChartProps, DomainTooltip(), euros(), DomainScore, euros(), SuiviContent(), SuiviData, buildDomains() (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (14): TOTAL_CHECKS, AnalyseContent(), CAT_ICON, catMeta(), euros(), FALLBACK_CAT_ICON, Filter, Prio (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.20
Nodes (13): GET(), GET(), secret(), signShopClaim(), verifyShopClaim(), exchangeCodeForToken(), exchangeSessionToken(), getShopInfo() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (7): KIND_META, ACTION_LABEL, buildPiloteFeed(), PiloteEntry, relativeFr(), SupabaseClient, PilotePage()

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (24): POST(), applyAnchorInjection(), applyGroupA(), applyGroupAAltText(), applyGroupADescriptions(), applyGroupAMeta(), classifyGroupASubtype(), findRelevantFile() (+16 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (18): `audit_logs`, `audits`, `blog_articles`, `competitor_alerts` (migration 019), `conversions`, `fixes`, `guides`, `image_optimizations` (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (3): OnboardingProgressProps, Step, steps

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (8): ModyAvatarProps, MISSION_META, Mission, PRIO_RANK, Props, METIERS, ModyOpenDetail, openMody()

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (14): 10. Clerk Auth, 11. Resend, 2. Architecture des fichiers, 8. Stripe, Acces apres paiement, Admin bypass, Comment l'auth est geree, Creation checkout session (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.32
Nodes (7): getProduct(), APPLY_ACTIONS, BuildOptions, buildProofRecords(), classifyProofType(), JSONLD_FIELDS, SupabaseClient

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): modify, json_ld, social_proof, trust_badges, urgency

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (13): applyGroupAJsonLd(), logAction(), SupabaseClient, parseGroupABackup(), getThemes(), promoteThemeToMain(), themeHasCoreFiles(), updateThemeAsset() (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (5): modify, json_ld, social_proof, trust_badges, urgency

### Community 35 - "Community 35"
Cohesion: 0.48
Nodes (5): planById(), buildSuiviData(), ResultatsPage(), statusConfig, SubscriptionPage()

### Community 36 - "Community 36"
Cohesion: 0.21
Nodes (12): GUIDE_TYPE_TO_MISSION, Metier, METIER_META, METIER_ORDER, MISSION_TO_METIER, MissionType, CopilotMissions(), euros() (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (9): POST(), Props, StoreMode, Tab, CAPABILITY_META, CapabilityMeta, fixCapability, fixMode() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (5): Theme, navItems, navItems, Props, SPACES

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (5): App Icon, Migration to New Shopify App, shopify.app.toml, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (4): inter, metadata, spaceGrotesk, syne

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (5): AgentChatProps, InlineAction, MISSION_STARTERS, Msg, STARTERS

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (4): 14. Graphify, Configuration, Sortie, Utilisation efficace

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (3): handle, modules, name

### Community 48 - "Community 48"
Cohesion: 0.50
Nodes (4): 9. Supabase, Migrations 001 a 019, Politiques RLS, Relations entre tables

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (3): Expiring Offline Tokens, Supabase Data (stores, audits, fixes, scores), Token Exchange Process

### Community 56 - "Community 56"
Cohesion: 0.11
Nodes (18): 4. Systeme d'audit, Agent concurrentiel et web_search, Apparence & navigation (`uiux`) — 10 checks, Appels API Anthropic, Appels Shopify API pendant l'audit, Calcul des euros/mois par probleme, Calcul du score /100, Concurrence & positionnement (`competitive`) — 5 checks (+10 more)

### Community 58 - "Community 58"
Cohesion: 0.25
Nodes (8): 4 metiers, 6 types de missions, 7. Mody Copilot, Appels API Anthropic (Copilot), Bandeau suggestion proactive, Comment le panel s'ouvre, Gate Pro, Les 4 metiers et 6 types de missions

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (8): 5. Systeme de corrections, App Blocks, Backup theme, Groupes A/B/C, Injections Liquid, Pipeline complet, Rollback, Stockage Supabase

### Community 72 - "Community 72"
Cohesion: 0.27
Nodes (7): LineItem, recordOrderPerformance(), SupabaseClient, ingestWebhook(), POST(), POST(), POST()

### Community 73 - "Community 73"
Cohesion: 0.26
Nodes (11): POST(), findRelevantFile(), generateFix(), createBackupTheme(), getThemeAsset(), getThemeAssets(), verifyThemeAsset(), classifyRiskGroup() (+3 more)

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (5): anthropic, GeneratedMission, GENERATORS, MissionContext, MissionStep

### Community 75 - "Community 75"
Cohesion: 0.13
Nodes (8): __dirname, envContent, envPath, faqPages, guidePages, pages, products, supabase

### Community 76 - "Community 76"
Cohesion: 0.17
Nodes (10): SCORE, PlanId, Subscription, generateWinningProducts(), WinningProduct, GET(), COUNT_BY_PLAN, GET() (+2 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (14): POST(), GET(), GET(), getStore(), generateBlogArticle(), BlogGenResult, deriveNiche(), generateAndPublishArticle() (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.36
Nodes (8): captureFixScreenshot(), captureScreenshot(), productUrlForStore(), ScreenshotWhen, storefrontIsGated(), SupabaseClient, uploadScreenshot(), POST()

### Community 80 - "Community 80"
Cohesion: 0.39
Nodes (8): APP_BLOCK_HANDLES, APP_EMBED_HANDLES, appBlockActive(), appEmbedActive(), blockMatches(), GET(), stripJsonComments(), ThemeBlock

### Community 81 - "Community 81"
Cohesion: 0.29
Nodes (7): 13. Design System, Composants reutilisables, Couleurs invariantes, Mode clair (`:root`), Mode sombre (`.dark`), Systeme de theme dark/light, Variables CSS completes

### Community 83 - "Community 83"
Cohesion: 0.40
Nodes (3): BadgeProps, BadgeVariant, variantClasses

### Community 84 - "Community 84"
Cohesion: 0.19
Nodes (10): metadata, LegalList(), LegalSection(), LegalShell(), metadata, LEGAL, metadata, faqs (+2 more)

### Community 85 - "Community 85"
Cohesion: 0.25
Nodes (8): CheckStatus, envCheck(), HealthCheck, HealthReport, REQUIRED_SCOPES, REQUIRED_TABLES, runHealthChecks(), SupabaseClient

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (7): 6. Pilote automatique (Webhooks), Crons, Les 4 webhooks, orders/paid — Alimentation product_performance, products/create — Pipeline complet, products/update — Detection regression + garde anti-boucle, themes/publish — Reinstallation App Blocks

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (5): Props, Guide, GuideType, Step, TYPES

### Community 91 - "Community 91"
Cohesion: 0.40
Nodes (5): 3. Flux Shopify OAuth, Etape par etape, Fichiers concernes, Gestion du token, Scopes demandes

### Community 93 - "Community 93"
Cohesion: 0.50
Nodes (3): GoogleCard(), Side, truncate()

### Community 95 - "Community 95"
Cohesion: 0.67
Nodes (3): euros(), Props, UrgentBanner()

### Community 96 - "Community 96"
Cohesion: 0.50
Nodes (3): 12. Vercel, Contraintes Hobby plan, Variables d'env configurees

### Community 97 - "Community 97"
Cohesion: 0.50
Nodes (4): 15. Points d'attention / Pieges connus, Bugs resolus et pourquoi ils existaient, Ce qui ne doit jamais etre modifie sans precaution, Limitations Shopify API

### Community 98 - "Community 98"
Cohesion: 0.50
Nodes (4): 1. Vue d'ensemble, Ce que fait Modify, Stack complete avec versions, Variables d'environnement

## Knowledge Gaps
- **427 isolated node(s):** `PreToolUse`, `trust_badges`, `social_proof`, `urgency`, `json_ld` (+422 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createServiceRoleClient()` connect `Community 13` to `Community 0`, `Community 2`, `Community 3`, `Community 6`, `Community 10`, `Community 11`, `Community 14`, `Community 16`, `Community 23`, `Community 24`, `Community 25`, `Community 32`, `Community 35`, `Community 38`, `Community 72`, `Community 73`, `Community 76`, `Community 78`, `Community 79`, `Community 80`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `Store` connect `Community 3` to `Community 0`, `Community 2`, `Community 6`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 20`, `Community 21`, `Community 24`, `Community 25`, `Community 30`, `Community 32`, `Community 35`, `Community 38`, `Community 72`, `Community 73`, `Community 76`, `Community 78`, `Community 79`, `Community 80`, `Community 85`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `logAction()` connect `Community 32` to `Community 2`, `Community 3`, `Community 6`, `Community 73`, `Community 11`, `Community 12`, `Community 76`, `Community 78`, `Community 15`, `Community 16`, `Community 14`, `Community 25`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `createServiceRoleClient()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`createServiceRoleClient()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `trust_badges`, `social_proof` to the rest of the system?**
  _428 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05388151174668029 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07199032062915911 - nodes in this community are weakly interconnected._