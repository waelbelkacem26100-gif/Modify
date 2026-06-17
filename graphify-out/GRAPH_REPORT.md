# Graph Report - modify  (2026-06-18)

## Corpus Check
- 251 files · ~115,220 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1191 nodes · 2591 edges · 99 communities (83 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3b62fe49`
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
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 105|Community 105]]

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
- `GET()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/api/fixes/apply/route.ts → lib/supabase-server.ts
- `Migration to New Shopify App` --conceptually_related_to--> `App Icon`  [INFERRED]
  MIGRATION_NEW_APP.md → app/icon.svg
- `GuidePage()` --calls--> `createServiceRoleClient()`  [EXTRACTED]
  app/(site)/dashboard/guide/page.tsx → lib/supabase-server.ts
- `PilotePage()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/(site)/dashboard/pilote/page.tsx → lib/supabase-server.ts
- `GET()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/api/blog/generate/route.ts → lib/supabase-server.ts

## Import Cycles
- None detected.

## Communities (99 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.34
Nodes (12): AccompagnementPage(), POST(), DashboardLayout(), DashboardPage(), POST(), ADMIN_USER_IDS, isAdmin(), getUserSubscription() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.22
Nodes (9): catMeta(), categoryPresentation(), euros(), ProofCard(), relativeDate(), ApiResponse, ProofRecord, ProofSide (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (64): anthropic, competitiveAgent, funnelAgent, mobileAgent, performanceSeoAgent, productPagesAgent, anthropic, AuditAgent (+56 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (44): GET(), page(), runFullAuditSequential(), applyPendingFixesForStore(), getPendingFixes(), PendingFix, SupabaseClient, ApprovalEmailData (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (6): categories, QA, breakdown, max, stats, total

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (33): dependencies, @anthropic-ai/sdk, @clerk/nextjs, lucide-react, next, react, react-dom, recharts (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (16): POST(), agentChat(), AgentMessage, ANCHOR_FALLBACK_PRIORITY, anthropic, BlogArticleContext, BlogArticleResult, buildProductHtml() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (23): duplicateTheme(), getBlogs(), getOrCreateBlog(), getOrdersForDateRange(), promoteThemeToMain(), putAssetSrc(), putAssetValue(), SHOPIFY_SCOPES (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): Anti-patterns à éviter, Ce qui existe déjà (v6, implémenté), Contraste WCAG — règle d'usage des couleurs Mody (vérifié v6), Mody — notes de direction de marque (réflexion, NON implémenté), Pistes pour la mascotte complète (à explorer), Prochaine session suggérée

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (15): POST(), SCORE, ORDER, isPaidPlan(), PaidPlanId, Plan, PlanId, PLANS (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (56): auditProgress(), runAuditStep(), Alert, monitorCompetitors(), SupabaseClient, PriceSuggestion, suggestPrices(), SupabaseClient (+48 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (27): GET(), anthropic, hdr(), OptimizationOutput, optimizeProduct(), OptimizeReport, ProductImage, ShopifyProductFull (+19 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (19): POST(), POST(), LineItem, recordOrderPerformance(), SupabaseClient, ingestWebhook(), ConnectPage(), POST() (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.21
Nodes (13): GET(), getStore(), POST(), compressFromUrl(), CompressResult, headImageSize(), optimizeStoreImages(), OptimizeSummary (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (10): GeneratedContent, ProductCard(), ProductCardProps, ProductState, ProductStatus, ProductWithStatus, ProductDescriptionResult, computeProductScore() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (13): generateMissionContent(), MISSION_TO_GUIDE_TYPE, missionTypeForProblem(), guideProblems(), GuideRow, latestCompletedAudit(), listMissions(), Mission (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): 1. Créer + lier la nouvelle app (CLI — recommandé), 2. Vérifier `shopify.app.toml` après le link, 3. Récupérer les nouvelles clés, 4. Mettre à jour les variables d'env, 5. Pousser la config vers la nouvelle app, 6. Redéployer Vercel, 7. Installer la nouvelle app sur la boutique de test, 8. Vérifier (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (9): ErrorProps, RunResult, Stats, Button, ButtonProps, Size, sizeClasses, Variant (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (33): 10. Bugs Potentiels, 1. Routes & API, 2. Composants, 3. Libs, 4. Crons, 5. Webhooks, 6. Variables d'Environnement, 7. Dépendances (+25 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (12): FixPanelProps, CATEGORY_PRESENTATION, MODE_PRESENTATION, PRIORITY_PRESENTATION, priorityPresentation(), AuditLog, AuditResult, AuditStatus (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (13): ConversionChartProps, DomainScore, euros(), SuiviContent(), SuiviData, planById(), buildDomains(), buildSuiviData() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (12): TOTAL_CHECKS, AnalyseContent(), CAT_ICON, euros(), FALLBACK_CAT_ICON, Filter, Prio, PRIORITY_META (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.35
Nodes (7): GET(), secret(), signShopClaim(), verifyShopClaim(), exchangeSessionToken(), verifyShopifySessionToken(), POST()

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (7): KIND_META, ACTION_LABEL, buildPiloteFeed(), PiloteEntry, relativeFr(), SupabaseClient, PilotePage()

### Community 25 - "Community 25"
Cohesion: 0.24
Nodes (16): applyGroupA(), applyGroupAAltText(), applyGroupADescriptions(), applyGroupAJsonLd(), applyGroupAMeta(), classifyGroupASubtype(), findRelevantFile(), GET() (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (22): 9. Supabase, `audit_logs`, `audits`, `blog_articles`, `competitor_alerts` (migration 019), `conversions`, `fixes`, `guides` (+14 more)

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (3): OnboardingProgressProps, Step, steps

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (8): ModyAvatarProps, MISSION_META, Mission, PRIO_RANK, Props, METIERS, ModyOpenDetail, openMody()

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (13): 10. Clerk Auth, 11. Resend, 14. Graphify, 2. Architecture des fichiers, Admin bypass, Comment l'auth est geree, Configuration, Documentation Technique Exhaustive — Modify (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.31
Nodes (7): APPLY_ACTIONS, BuildOptions, buildProofRecords(), classifyProofType(), JSONLD_FIELDS, SupabaseClient, GET()

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): modify, json_ld, social_proof, trust_badges, urgency

### Community 32 - "Community 32"
Cohesion: 0.23
Nodes (13): reinstallAppBlocks(), SupabaseClient, appBlockForFix(), AppBlockSpec, enableProductAppBlock(), EnableResult, getAppHandle(), isProductSection() (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (5): modify, json_ld, social_proof, trust_badges, urgency

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (11): POST(), GroupABackup, parseGroupABackup(), restoreGroupABackup(), RestoreResult, SupabaseClient, getProductWithImages(), isThemeBlocksRejection() (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.21
Nodes (12): GUIDE_TYPE_TO_MISSION, Metier, METIER_META, METIER_ORDER, MISSION_TO_METIER, MissionType, CopilotMissions(), euros() (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (6): Props, StoreMode, Tab, beforeAfter(), fixMode(), whatChanged()

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
Cohesion: 0.33
Nodes (8): GET(), getStore(), PATCH(), POST(), VALID_TYPES, generateGuide(), GuideContext, GuideType

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (3): handle, modules, name

### Community 48 - "Community 48"
Cohesion: 0.43
Nodes (6): GET(), exchangeCodeForToken(), getShopInfo(), parseTokenResponse(), refreshAccessToken(), validateHmac()

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (3): Expiring Offline Tokens, Supabase Data (stores, audits, fixes, scores), Token Exchange Process

### Community 53 - "Community 53"
Cohesion: 0.29
Nodes (5): Applied, Article, Audit, PRIO, SeoProblem

### Community 56 - "Community 56"
Cohesion: 0.20
Nodes (10): 4. Systeme d'audit, Agent concurrentiel et web_search, Appels API Anthropic, Appels Shopify API pendant l'audit, Calcul des euros/mois par probleme, Calcul du score /100, Declenchement, Google PageSpeed (+2 more)

### Community 58 - "Community 58"
Cohesion: 0.25
Nodes (8): 4 metiers, 6 types de missions, 7. Mody Copilot, Appels API Anthropic (Copilot), Bandeau suggestion proactive, Comment le panel s'ouvre, Gate Pro, Les 4 metiers et 6 types de missions

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (8): 5. Systeme de corrections, App Blocks, Backup theme, Groupes A/B/C, Injections Liquid, Pipeline complet, Rollback, Stockage Supabase

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (4): ActivePromo, Bundle, BundleProduct, Candidate

### Community 73 - "Community 73"
Cohesion: 0.22
Nodes (13): POST(), applyAnchorInjection(), injectBeforeSchemaOrEnd(), PATCH(), findRelevantFile(), extractRealAnchors(), generateFix(), createBackupTheme() (+5 more)

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (5): anthropic, GeneratedMission, GENERATORS, MissionContext, MissionStep

### Community 75 - "Community 75"
Cohesion: 0.13
Nodes (8): __dirname, envContent, envPath, faqPages, guidePages, pages, products, supabase

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (7): generateWinningProducts(), WinningProduct, GET(), COUNT_BY_PLAN, GET(), POST(), userStore()

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (14): POST(), GET(), GET(), getStore(), generateBlogArticle(), BlogGenResult, deriveNiche(), generateAndPublishArticle() (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.16
Nodes (15): POST(), Props, CAPABILITY_META, CapabilityMeta, fixCapability, captureFixScreenshot(), captureScreenshot(), productUrlForStore() (+7 more)

### Community 80 - "Community 80"
Cohesion: 0.39
Nodes (8): APP_BLOCK_HANDLES, APP_EMBED_HANDLES, appBlockActive(), appEmbedActive(), blockMatches(), GET(), stripJsonComments(), ThemeBlock

### Community 81 - "Community 81"
Cohesion: 0.29
Nodes (7): 13. Design System, Composants reutilisables, Couleurs invariantes, Mode clair (`:root`), Mode sombre (`.dark`), Systeme de theme dark/light, Variables CSS completes

### Community 82 - "Community 82"
Cohesion: 0.21
Nodes (4): metadata, LEGAL, faqs, metadata

### Community 83 - "Community 83"
Cohesion: 0.40
Nodes (3): BadgeProps, BadgeVariant, variantClasses

### Community 84 - "Community 84"
Cohesion: 0.20
Nodes (8): channels, metadata, metadata, LegalList(), LegalSection(), LegalShell(), metadata, metadata

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

### Community 94 - "Community 94"
Cohesion: 0.25
Nodes (8): Apparence & navigation (`uiux`) — 10 checks, Concurrence & positionnement (`competitive`) — 5 checks, Confiance & securite (`trust`) — 10 checks, Experience mobile (`mobile`) — 8 checks, Fiches produits (`products`) — 11 checks, Les 62 checks, Tunnel d'achat (`funnel`) — 9 checks, Vitesse & visibilite Google (`perf_seo`) — 9 checks

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

### Community 99 - "Community 99"
Cohesion: 0.38
Nodes (6): POST(), getLearnedPriority(), getTypeEffectiveness(), prioritizeIssues(), SupabaseClient, TypeEffectiveness

### Community 105 - "Community 105"
Cohesion: 0.40
Nodes (5): 8. Stripe, Acces apres paiement, Creation checkout session, Plans et price IDs, Webhook Stripe

## Knowledge Gaps
- **427 isolated node(s):** `PreToolUse`, `trust_badges`, `social_proof`, `urgency`, `json_ld` (+422 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createServiceRoleClient()` connect `Community 13` to `Community 0`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 21`, `Community 23`, `Community 24`, `Community 25`, `Community 30`, `Community 35`, `Community 44`, `Community 48`, `Community 73`, `Community 76`, `Community 78`, `Community 79`, `Community 80`, `Community 99`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `Store` connect `Community 11` to `Community 0`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 20`, `Community 21`, `Community 24`, `Community 25`, `Community 30`, `Community 32`, `Community 35`, `Community 44`, `Community 73`, `Community 76`, `Community 78`, `Community 79`, `Community 80`, `Community 85`, `Community 99`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `logAction()` connect `Community 11` to `Community 32`, `Community 2`, `Community 35`, `Community 3`, `Community 7`, `Community 73`, `Community 12`, `Community 76`, `Community 78`, `Community 14`, `Community 16`, `Community 25`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `createServiceRoleClient()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`createServiceRoleClient()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `trust_badges`, `social_proof` to the rest of the system?**
  _428 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05737234652897304 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06704260651629072 - nodes in this community are weakly interconnected._