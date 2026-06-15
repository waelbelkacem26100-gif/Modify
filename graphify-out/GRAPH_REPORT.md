# Graph Report - modify  (2026-06-15)

## Corpus Check
- 241 files · ~99,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1015 nodes · 2296 edges · 79 communities (63 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `317cbd21`
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
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 87|Community 87]]

## God Nodes (most connected - your core abstractions)
1. `createServiceRoleClient()` - 127 edges
2. `Store` - 73 edges
3. `logAction()` - 43 edges
4. `getProductsDetailed()` - 33 edges
5. `shopifyHeaders()` - 30 edges
6. `getUserSubscription()` - 28 edges
7. `getThemes()` - 26 edges
8. `isAdmin()` - 21 edges
9. `getThemeAsset()` - 20 edges
10. `PATCH()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Migration to New Shopify App` --conceptually_related_to--> `App Icon`  [INFERRED]
  MIGRATION_NEW_APP.md → app/icon.svg
- `PreviewPage()` --calls--> `createServiceRoleClient()`  [EXTRACTED]
  app/(site)/preview/page.tsx → lib/supabase-server.ts
- `PreviewResultatsPage()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/(site)/preview/resultats/page.tsx → lib/supabase-server.ts
- `GET()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/api/blog/generate/route.ts → lib/supabase-server.ts
- `POST()` --calls--> `createServiceRoleClient()`  [INFERRED]
  app/api/blog/generate/route.ts → lib/supabase-server.ts

## Import Cycles
- None detected.

## Communities (79 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (52): AccompagnementPage(), PARTICLES, POST(), POST(), ConversionChartProps, DashboardLayout(), navItems, OnboardingProgressProps (+44 more)

### Community 1 - "Community 1"
Cohesion: 0.19
Nodes (23): POST(), applyAnchorInjection(), applyGroupA(), applyGroupAAltText(), applyGroupADescriptions(), applyGroupAJsonLd(), applyGroupAMeta(), classifyGroupASubtype() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (62): anthropic, competitiveAgent, funnelAgent, mobileAgent, performanceSeoAgent, productPagesAgent, anthropic, AuditAgent (+54 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (47): GET(), page(), runFullAuditSequential(), applyPendingFixesForStore(), getPendingFixes(), PendingFix, SupabaseClient, ApprovalEmailData (+39 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (16): channels, metadata, categories, QA, steps, METIERS, breakdown, max (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (33): dependencies, @anthropic-ai/sdk, @clerk/nextjs, lucide-react, next, react, react-dom, recharts (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (26): GET(), getStore(), POST(), GET(), getStore(), PATCH(), POST(), VALID_TYPES (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (31): GET(), generateProductFaq(), fixAllSeo(), SeoFixResult, SupabaseClient, buildInstallUrl(), createBackupTheme(), duplicateTheme() (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): Anti-patterns à éviter, Ce qui existe déjà (v6, implémenté), Contraste WCAG — règle d'usage des couleurs Mody (vérifié v6), Mody — notes de direction de marque (réflexion, NON implémenté), Pistes pour la mascotte complète (à explorer), Prochaine session suggérée

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (18): GroupABackup, parseGroupABackup(), restoreGroupABackup(), RestoreResult, SupabaseClient, getProduct(), getProductSeoMeta(), getThemeAsset() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.26
Nodes (11): alreadyDiscounted(), applyPromos(), detectPromoCandidates(), firstPrice(), PromoCandidate, revertPromos(), SupabaseClient, GET() (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.20
Nodes (12): buildAgentContext(), euros(), SupabaseClient, getSoldProductIds(), anthropic, extractJsonArray(), GeneratedProduct, getStoreContext() (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (9): GET(), anthropic, pickCrossSellSettings(), plainLen(), runSeoAudit(), SeoAuditResult, SeoProblem, getProductsDetailed() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (12): GET(), getStore(), POST(), compressFromUrl(), CompressResult, headImageSize(), optimizeStoreImages(), OptimizeSummary (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (10): GeneratedContent, ProductCard(), ProductCardProps, ProductState, ProductStatus, ProductWithStatus, ProductDescriptionResult, computeProductScore() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (40): anthropic, GeneratedMission, generateMissionContent(), GENERATORS, MissionContext, MissionStep, GUIDE_TYPE_TO_MISSION, Metier (+32 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): 1. Créer + lier la nouvelle app (CLI — recommandé), 2. Vérifier `shopify.app.toml` après le link, 3. Récupérer les nouvelles clés, 4. Mettre à jour les variables d'env, 5. Pousser la config vers la nouvelle app, 6. Redéployer Vercel, 7. Installer la nouvelle app sur la boutique de test, 8. Vérifier (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (6): Button, ButtonProps, Size, sizeClasses, Variant, variantClasses

### Community 19 - "Community 19"
Cohesion: 0.19
Nodes (7): POST(), StoreMode, Tab, CAPABILITY_META, CapabilityMeta, fixCapability, Fix

### Community 20 - "Community 20"
Cohesion: 0.36
Nodes (8): captureFixScreenshot(), captureScreenshot(), productUrlForStore(), ScreenshotWhen, storefrontIsGated(), SupabaseClient, uploadScreenshot(), POST()

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (12): TOTAL_CHECKS, AnalyseContent(), CAT_ICON, euros(), FALLBACK_CAT_ICON, Filter, Prio, PRIORITY_META (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (37): POST(), POST(), POST(), GET(), auditProgress(), GET(), GET(), ConnectPage() (+29 more)

### Community 24 - "Community 24"
Cohesion: 0.28
Nodes (4): ApiResponse, ProofRecord, ProofSide, ProofType

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (8): appBlockForFix(), AppBlockSpec, enableProductAppBlock(), EnableResult, getAppHandle(), isProductSection(), pickProductSectionKey(), stripJsonComments()

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (7): COMPONENT_LABELS, Components, Current, GlobalScoreCard(), HistoryPoint, scoreColor(), ScoreData

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (5): Check, CheckStatus, COLOR, ICON, Report

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (5): HistoryPoint, Latest, PageSpeedCard(), PsData, scoreColor()

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (5): Applied, Article, Audit, PRIO, SeoProblem

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): modify, json_ld, social_proof, trust_badges, urgency

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (8): POST(), findRelevantFile(), generateFix(), getThemeAssets(), classifyRiskGroup(), computeRiskGroup(), SupabaseClient, RiskGroup

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (5): modify, json_ld, social_proof, trust_badges, urgency

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (4): ActivePromo, Bundle, BundleProduct, Candidate

### Community 36 - "Community 36"
Cohesion: 0.40
Nodes (3): BlockDef, BLOCKS, StatusResponse

### Community 38 - "Community 38"
Cohesion: 0.24
Nodes (9): GET(), CheckStatus, envCheck(), HealthCheck, HealthReport, REQUIRED_SCOPES, REQUIRED_TABLES, runHealthChecks() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.38
Nodes (6): POST(), getLearnedPriority(), getTypeEffectiveness(), prioritizeIssues(), SupabaseClient, TypeEffectiveness

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (5): App Icon, Migration to New Shopify App, shopify.app.toml, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (4): inter, metadata, spaceGrotesk, syne

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (3): GoogleCard(), Side, truncate()

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (3): handle, modules, name

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (3): Expiring Offline Tokens, Supabase Data (stores, audits, fixes, scores), Token Exchange Process

### Community 73 - "Community 73"
Cohesion: 0.39
Nodes (8): APP_BLOCK_HANDLES, APP_EMBED_HANDLES, appBlockActive(), appEmbedActive(), blockMatches(), GET(), stripJsonComments(), ThemeBlock

### Community 74 - "Community 74"
Cohesion: 0.24
Nodes (6): catMeta(), Props, categoryPresentation(), euros(), ProofCard(), relativeDate()

### Community 75 - "Community 75"
Cohesion: 0.13
Nodes (8): __dirname, envContent, envPath, faqPages, guidePages, pages, products, supabase

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (14): POST(), GET(), GET(), getStore(), generateBlogArticle(), BlogGenResult, deriveNiche(), generateAndPublishArticle() (+6 more)

### Community 80 - "Community 80"
Cohesion: 0.40
Nodes (3): BadgeProps, BadgeVariant, variantClasses

### Community 83 - "Community 83"
Cohesion: 0.16
Nodes (9): ModyAvatarProps, MISSION_META, Mission, PRIO_RANK, Props, ModyOpenDetail, openMody(), withPreviewToken() (+1 more)

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (8): SupabaseClient, getThemes(), isThemeBlocksRejection(), promoteThemeToMain(), themeHasCoreFiles(), updateThemeAsset(), POST(), POST()

### Community 87 - "Community 87"
Cohesion: 0.12
Nodes (15): FixPanelProps, beforeAfter(), CATEGORY_PRESENTATION, fixMode(), MODE_PRESENTATION, PRIORITY_PRESENTATION, priorityPresentation(), whatChanged() (+7 more)

## Knowledge Gaps
- **307 isolated node(s):** `PreToolUse`, `trust_badges`, `social_proof`, `urgency`, `json_ld` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createServiceRoleClient()` connect `Community 23` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 16`, `Community 19`, `Community 20`, `Community 32`, `Community 38`, `Community 39`, `Community 73`, `Community 78`, `Community 83`, `Community 84`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `Store` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 19`, `Community 20`, `Community 23`, `Community 32`, `Community 38`, `Community 39`, `Community 73`, `Community 78`, `Community 83`, `Community 84`, `Community 87`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `createServiceRoleClient()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`createServiceRoleClient()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `trust_badges`, `social_proof` to the rest of the system?**
  _308 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.053289473684210525 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06049382716049383 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06393442622950819 - nodes in this community are weakly interconnected._