/**
 * Comparatif AquaDrive v4.1 → v5
 *
 * Ce script :
 * 1. Lit le DERNIER audit terminé d’AquaDrive depuis Supabase
 * 2. Collecte les données déterministes v5 (sans LLM, budget ~10s)
 * 3. Affiche le rapport comparatif : honnêteté PSI, GEO simulation, accessibilité, points forts
 *
 * Usage : node scripts/compare-audit-v5.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SHOP = 'hvzrra-fb.myshopify.com'
const SHOPIFY_API_VERSION = '2026-04'
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36'

// ── Helpers ──────────────────────────────────────────────────────────────────

function banner(title) {
  const line = '═'.repeat(60)
  console.log(`\n${line}\n  ${title}\n${line}`)
}

function section(label) {
  console.log(`\n── ${label} ──`)
}

function ok(msg)   { console.log(`  ✅  ${msg}`) }
function warn(msg) { console.log(`  ⚠️   ${msg}`) }
function info(msg) { console.log(`  ℹ️   ${msg}`) }
function diff(label, before, after) {
  const changed = before !== after
  console.log(`  ${changed ? '🔄' : '  '} ${label}`)
  if (changed) {
    console.log(`       v4.1 : ${before}`)
    console.log(`       v5   : ${after}`)
  } else {
    console.log(`       = ${after}`)
  }
}

// ── 1. Dernier audit Supabase ─────────────────────────────────────────────────

banner('ÉTAPE 1 — Dernier audit AquaDrive (Supabase)')

const { data: store } = await supabase
  .from('stores').select('*').eq('shop_domain', SHOP).limit(1).maybeSingle()

if (!store) {
  console.error('❌ Boutique AquaDrive introuvable en base')
  process.exit(1)
}
info(`Store ID : ${store.id} — ${store.shop_name ?? store.shop_domain}`)
info(`Token : ${store.access_token ? store.access_token.slice(0, 12) + '…' : 'ABSENT'}`)

const { data: lastAudit } = await supabase
  .from('audits').select('*').eq('store_id', store.id).eq('status', 'completed')
  .order('created_at', { ascending: false }).limit(1).maybeSingle()

if (!lastAudit) {
  warn('Aucun audit terminé trouvé pour AquaDrive')
} else {
  info(`Dernier audit : ${lastAudit.id} — créé le ${new Date(lastAudit.created_at).toLocaleDateString('fr-FR')}`)
  const problems = Array.isArray(lastAudit.results) ? lastAudit.results : []
  info(`Problèmes enregistrés : ${problems.length}`)
  const cats = [...new Set(problems.map(p => p.category))]
  info(`Catégories : ${cats.join(', ')}`)
  const totalLoss = problems.reduce((s, p) => s + (p.impact_euros || 0), 0)
  info(`Impact total estimé : ${totalLoss}€/mois`)
}

// ── 2. Collecte déterministe v5 ───────────────────────────────────────────────

banner('ÉTAPE 2 — Collecte déterministe v5 (sans LLM)')

// 2a. Test vitrine (psiAllowed)
section('Test accès vitrine (honnêteté PSI v5)')
let storefrontAccessible = false
try {
  const res = await fetch(`https://${SHOP}`, { redirect: 'follow', headers: { 'User-Agent': DESKTOP_UA }, signal: AbortSignal.timeout(8000) })
  storefrontAccessible = !/\/password/.test(res.url)
  if (storefrontAccessible) {
    ok(`Vitrine accessible — PSI autorisé`)
  } else {
    warn(`Vitrine protégée (redirige vers ${res.url.split('?')[0]})`)
    diff('PSI v4.1 vs v5',
      'PSI lancé → mesure la page de mot de passe (HTML minimal, score ~95/100 TROMPEUR)',
      'PSI IGNORÉ — honnêteté : on ne mesure jamais la page de mot de passe'
    )
  }
} catch (e) {
  warn(`Vitrine inaccessible : ${e.message}`)
}

// 2b. Pages via Admin API
section('Pages boutique (Admin API — fonctionne même vitrine protégée)')
let pages = []
try {
  const res = await fetch(
    `https://${SHOP}/admin/api/${SHOPIFY_API_VERSION}/pages.json?limit=50&fields=id,title,handle,body_html`,
    { headers: { 'X-Shopify-Access-Token': store.access_token }, signal: AbortSignal.timeout(10000) }
  )
  if (res.ok) {
    const data = await res.json()
    pages = (data.pages ?? []).map(p => ({
      title: p.title,
      handle: p.handle,
      body_words: (p.body_html ?? '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    }))
    info(`${pages.length} page(s) récupérée(s) via Admin API`)
    pages.forEach(p => info(`  - ${p.title} (${p.body_words} mots) [${p.handle}]`))
  }
} catch (e) {
  warn(`Pages Admin API échouée : ${e.message}`)
}

// 2c. GEO simulation déterministe
section('GEO simulation v5 (déterministe)')
const GUIDE_RE = /guide|conseil|comment[-\s]?choisir|comparatif|\bvs\b|versus|diff[eé]rence|tuto|astuces?/i
const FAQ_RE   = /\bfaq\b|questions?[-\s]?fréquentes?|aide|support/i

const guidePages = pages.filter(p => GUIDE_RE.test(`${p.handle} ${p.title}`) && p.body_words >= 100)
const faqPages   = pages.filter(p => FAQ_RE.test(`${p.handle} ${p.title}`) && p.body_words >= 150)

if (guidePages.length > 0) {
  ok(`Guide(s) détecté(s) : ${guidePages.map(p => `« ${p.title} »`).join(', ')}`)
} else {
  warn('Aucune page guide/comparatif — AquaDrive n’a pas de contenu GEO pour être citée par les IA')
}
if (faqPages.length > 0) {
  ok(`FAQ détectée(s) : ${faqPages.map(p => `« ${p.title} »`).join(', ')}`)
} else {
  warn('Aucune page FAQ — signal GEO manquant')
}
diff('GEO dans l’audit v4.1 vs v5',
  'Évaluation 100% LLM — risque d’invention si vitrine inaccessible',
  `Signaux réels injectés : ${guidePages.length} guide(s), ${faqPages.length} FAQ(s) — l’agent ne peut plus inventer`
)

// 2d. Produits
section('Produits (Admin API)')
let products = []
try {
  const res = await fetch(
    `https://${SHOP}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=50&fields=id,title,handle,body_html,images,variants,product_type`,
    { headers: { 'X-Shopify-Access-Token': store.access_token }, signal: AbortSignal.timeout(10000) }
  )
  if (res.ok) {
    const data = await res.json()
    products = (data.products ?? []).map(p => {
      const text = (p.body_html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const words = text.split(/\s+/).filter(Boolean)
      return {
        title: p.title,
        description_words: words.length,
        image_count: (p.images ?? []).length,
        images_missing_alt: (p.images ?? []).filter(i => !i.alt?.trim()).length,
        variant_count: (p.variants ?? []).length,
      }
    })
    info(`${products.length} produit(s) récupéré(s)`)
    const deepCount = products.filter(p => p.description_words >= 200).length
    info(`Descriptions ≥ 200 mots : ${deepCount}/${products.length}`)
    const noAlt = products.reduce((s, p) => s + p.images_missing_alt, 0)
    const totalImgs = products.reduce((s, p) => s + p.image_count, 0)
    info(`Images sans texte descriptif : ${noAlt}/${totalImgs}`)
  }
} catch (e) {
  warn(`Produits Admin API échouée : ${e.message}`)
}

// 2e. Accessibilité (thème — Admin API)
section('Accessibilité WCAG v5 (couleurs réelles du thème)')
try {
  const themesRes = await fetch(
    `https://${SHOP}/admin/api/${SHOPIFY_API_VERSION}/themes.json`,
    { headers: { 'X-Shopify-Access-Token': store.access_token }, signal: AbortSignal.timeout(10000) }
  )
  if (themesRes.ok) {
    const { themes } = await themesRes.json()
    const main = themes.find(t => t.role === 'main') ?? themes[0]
    info(`Thème principal : ${main?.name ?? 'inconnu'} (id: ${main?.id})`)
    if (main) {
      const assetRes = await fetch(
        `https://${SHOP}/admin/api/${SHOPIFY_API_VERSION}/themes/${main.id}/assets.json?asset[key]=config/settings_data.json`,
        { headers: { 'X-Shopify-Access-Token': store.access_token }, signal: AbortSignal.timeout(10000) }
      )
      if (assetRes.ok) {
        const { asset } = await assetRes.json()
        if (asset?.value) {
          info('settings_data.json récupéré — analyse des couleurs possible')

          // Simplified contrast check
          const HEX = /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$|^#[0-9a-f]{8}$/i
          try {
            const data = JSON.parse(asset.value)
            const current = typeof data.current === 'object' ? data.current : null
            if (current) {
              const schemes = current.color_schemes
              if (schemes) {
                const first = Object.entries(schemes)[0]
                const s = first?.[1]?.settings
                if (s) {
                  const get = k => (typeof s[k] === 'string' && HEX.test(s[k]) ? s[k] : null)
                  const bg = get('background')
                  const fg = get('foreground') ?? get('text')
                  const btnBg = get('primary_button_background') ?? get('button_background')
                  const btnText = get('primary_button_text') ?? get('button_text')
                  if (fg && bg) info(`Paire texte/fond : ${fg} sur ${bg}`)
                  if (btnText && btnBg) info(`Bouton d’achat : ${btnText} sur ${btnBg}`)
                  ok('Couleurs thème extraites — contraste WCAG calculable')
                }
              }
            }
          } catch { warn('JSON settings illisible') }
        } else {
          warn('settings_data.json absent — aucune couleur disponible')
        }
      }
    }
    diff('Accessibilité v4.1 vs v5',
      'Absent — aucun check WCAG dans v4',
      'Module WCAG v5 : contraste réel depuis Admin API + checks HTML structurels'
    )
  }
} catch (e) {
  warn(`Thème Admin API échoué : ${e.message}`)
}

// ── 3. Rapport comparatif ─────────────────────────────────────────────────────

banner('ÉTAPE 3 — Rapport comparatif v4.1 → v5')

const checks_base = 60 // TOTAL_CHECKS approximate
const geo_checks = 4
const a11y_checks_estimated = 4 // pages + colors
const v5_total = checks_base + geo_checks + a11y_checks_estimated

console.log(`
┌─────────────────────────────────────────────────────────────┐
│                   RÉSUMÉ COMPARATIF                         │
├─────────────────────┬───────────────────────────────────────┤
│ Dimension           │ v4.1 → v5                             │
├─────────────────────┼───────────────────────────────────────┤
│ Points de contrôle  │ ~${checks_base} → ${v5_total}+ (${geo_checks} GEO + ${a11y_checks_estimated} accessibilité)      │
│ Honnêteté PSI       │ ❌ mesure /password  → ✅ skip honnête│
│ GEO                 │ ❌ LLM seul          → ✅ + déterministe│
│ Accessibilité WCAG  │ ❌ absent            → ✅ module v5    │
│ Points forts        │ ❌ absent            → ✅ déterministe │
│ PSI page produit    │ ❌ absent            → ✅ 2e mesure v5 │
│ Score de précision  │ ❌ statique          → ✅ dynamique    │
└─────────────────────┴───────────────────────────────────────┘
`)

if (lastAudit) {
  const problems = Array.isArray(lastAudit.results) ? lastAudit.results : []
  const v4PerfSeo = problems.filter(p => p.category === 'perf_seo')
  if (v4PerfSeo.length > 0) {
    console.log('Problèmes perf_seo v4 (potentiellement affectés par le bug PSI mot de passe) :')
    v4PerfSeo.forEach(p => {
      const suspect = /vite|charg|seconde|mobile|lcp|cls|score/i.test(p.title + p.description)
      console.log(`  ${suspect ? '⚠️  SUSPECT (peut venir du bug PSI)' : '   '} — ${p.title} (${p.impact_euros}€)`)
    })
  }
}

console.log('\n✅ Rapport comparatif terminé.')
console.log('   Prochaine étape : relancer un audit v5 sur AquaDrive depuis Modify et vérifier les résultats.\n')
