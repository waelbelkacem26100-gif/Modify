import { getThemes, getThemeAsset } from '@/lib/shopify'
import type { Store } from '@/types'
import type { Problem, Strength } from './types'

/**
 * Module Accessibilité WCAG v5 — intégré à la catégorie 🎨 UI/UX (décision
 * d'architecture : 7 catégories visibles conservées ; l'accessibilité EST de
 * l'expérience d'interface, la conformité légale est mentionnée dans le texte).
 *
 * Tout est DÉTERMINISTE (pas de LLM) :
 *  - contraste : couleurs réelles lues dans config/settings_data.json du thème
 *    (Admin API → fonctionne même vitrine protégée), ratio WCAG officiel ;
 *  - structure HTML (h1 unique, liens explicites, labels) : uniquement si le
 *    HTML public est disponible — sinon silence honnête.
 */

// ── Ratio de contraste WCAG 2.x ───────────────────────────────────────────────
/** Hex 3/6/8 chiffres → RGB. L'alpha (8 chiffres, fréquent dans les thèmes
 * récents ex #000000cf) est composité sur le fond fourni — c'est la couleur
 * réellement PERÇUE qui compte pour le contraste. */
function hexToRgb(hex: string, over?: [number, number, number]): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})$/i)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const rgb: [number, number, number] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  if (h.length === 8) {
    const alpha = parseInt(h.slice(6, 8), 16) / 255
    const base = over ?? [255, 255, 255]
    return [0, 1, 2].map((i) => Math.round(rgb[i] * alpha + base[i] * (1 - alpha))) as [number, number, number]
  }
  return rgb
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Ratio de contraste WCAG entre texte (hexFg, alpha composité sur le fond) et fond. */
export function contrastRatio(hexFg: string, hexBg: string): number | null {
  const bg = hexToRgb(hexBg)
  if (!bg) return null
  const fg = hexToRgb(hexFg, bg)
  if (!fg) return null
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100
}

// ── Extraction des couleurs du thème ─────────────────────────────────────────
interface ThemeColors {
  pairs: { label: string; fg: string; bg: string; isButton: boolean }[]
}

/** Cherche les paires texte/fond et bouton/fond dans settings_data.json (schéma
 * variable selon les thèmes — détection par NOM de clé, tolérante). */
export function extractThemeColorPairs(settingsJson: string): ThemeColors {
  const pairs: ThemeColors['pairs'] = []
  const HEX = /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$|^#[0-9a-f]{8}$/i
  try {
    const data = JSON.parse(settingsJson) as { current?: Record<string, unknown> | string }
    const current = typeof data.current === 'object' && data.current ? data.current : null
    if (!current) return { pairs }

    // Cas moderne (Horizon/Dawn…) : color_schemes.scheme-N.settings — on apparie
    // STRICTEMENT à l'intérieur du même schéma (jamais entre sections différentes).
    const schemes = (current as { color_schemes?: Record<string, { settings?: Record<string, unknown> }> }).color_schemes
    if (schemes && typeof schemes === 'object') {
      const first = Object.entries(schemes)[0]
      const s = first?.[1]?.settings as Record<string, string> | undefined
      if (s) {
        const get = (k: string) => (typeof s[k] === 'string' && HEX.test(s[k]) ? s[k] : null)
        const bg = get('background')
        const fg = get('foreground') ?? get('foreground_heading') ?? get('text')
        const btnBg = get('primary_button_background') ?? get('button_background')
        const btnText = get('primary_button_text') ?? get('button_text') ?? get('button_label')
        if (fg && bg) pairs.push({ label: `texte principal sur fond de page (schéma « ${first[0]} »)`, fg, bg, isButton: false })
        if (btnText && btnBg) pairs.push({ label: 'texte du bouton d’achat sur son fond', fg: btnText, bg: btnBg, isButton: true })
        return { pairs }
      }
    }

    // Fallback thèmes anciens : clés plates colors_text / colors_background.
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(current)) {
      if (typeof v === 'string' && HEX.test(v.trim())) flat[k.toLowerCase()] = v.trim()
    }
    const text = flat['colors_text'] ?? flat['color_text'] ?? flat['text_color']
    const bg = flat['colors_background_1'] ?? flat['colors_background'] ?? flat['color_body_bg'] ?? flat['background_color']
    const btnBg = flat['colors_accent_1'] ?? flat['color_button'] ?? flat['button_background']
    const btnText = flat['colors_solid_button_labels'] ?? flat['color_button_text'] ?? flat['button_text']
    if (text && bg) pairs.push({ label: 'texte principal sur fond de page', fg: text, bg, isButton: false })
    if (btnBg && btnText) pairs.push({ label: 'texte du bouton d’achat sur son fond', fg: btnText, bg: btnBg, isButton: true })
  } catch { /* settings illisibles → aucune paire, silence honnête */ }
  return { pairs }
}

// ── Checks HTML (uniquement si vitrine accessible) ───────────────────────────
function htmlChecks(html: string): { problems: Omit<Problem, 'id' | 'category'>[] } {
  const problems: Omit<Problem, 'id' | 'category'>[] = []
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length
  if (h1Count === 0 || h1Count > 1) {
    problems.push({
      title: h1Count === 0 ? 'Votre page d’accueil n’a pas de titre principal' : 'Votre page d’accueil a plusieurs titres principaux',
      description: `${h1Count} titre(s) principal(aux) détecté(s) au lieu d'un seul. Les lecteurs d'écran et Google s'appuient dessus pour comprendre la page.`,
      impact_euros: 10,
      priority: 'low',
      fix_available: false,
      recommendation: 'Dans l’éditeur de thème, gardez UN seul grand titre par page (le nom de la boutique ou la promesse principale).',
      affected_items: ['Page d’accueil'],
      capability: 'guide',
    })
  }
  const genericLinks = (html.match(/>(\s*(cliquez ici|en savoir plus|voir plus|click here|learn more)\s*)</gi) ?? []).length
  if (genericLinks >= 2) {
    problems.push({
      title: 'Des liens « en savoir plus » sans contexte',
      description: `${genericLinks} liens génériques détectés. Un visiteur utilisant un lecteur d'écran entend une liste de « en savoir plus » sans savoir où ils mènent.`,
      impact_euros: 10,
      priority: 'low',
      fix_available: false,
      recommendation: 'Remplacez par des libellés explicites : « Découvrir nos propulseurs », « Lire le guide des tailles »…',
      affected_items: ['Page d’accueil'],
      capability: 'guide',
    })
  }
  const inputs = (html.match(/<input[^>]*type="(text|email)"[^>]*>/gi) ?? [])
  const unlabeled = inputs.filter((i) => !/aria-label|placeholder|id=/i.test(i)).length
  if (unlabeled > 0) {
    problems.push({
      title: 'Des champs de formulaire sans étiquette',
      description: `${unlabeled} champ(s) (newsletter, recherche…) sans description lisible par les aides techniques.`,
      impact_euros: 10,
      priority: 'low',
      fix_available: false,
      recommendation: 'Ajoutez une étiquette ou un texte d’aide à chaque champ dans l’éditeur de thème.',
      affected_items: ['Formulaires de la page d’accueil'],
      capability: 'guide',
    })
  }
  return { problems }
}

export interface AccessibilityFindings {
  problems: Omit<Problem, 'id' | 'category'>[]
  strengths: Omit<Strength, 'category'>[]
  /** Nombre de points de contrôle réellement exécutés (pour le score de précision dynamique). */
  checksRun: number
}

/**
 * Exécute l'audit accessibilité. Couleurs : toujours possibles (Admin API).
 * HTML : seulement si fourni. Honnêteté : un check non exécutable n'est pas compté.
 */
export async function runAccessibilityChecks(store: Store, homeHtml: string | null): Promise<AccessibilityFindings> {
  const problems: AccessibilityFindings['problems'] = []
  const strengths: AccessibilityFindings['strengths'] = []
  let checksRun = 0

  // 1-2. Contrastes depuis les couleurs réelles du thème
  try {
    const themes = await getThemes(store.shop_domain, store.access_token)
    const main = themes.find((t) => t.role === 'main') ?? themes[0]
    const asset = main
      ? await getThemeAsset(store.shop_domain, store.access_token, String(main.id), 'config/settings_data.json')
      : null
    if (asset?.value) {
      const { pairs } = extractThemeColorPairs(asset.value)
      for (const pair of pairs) {
        const ratio = contrastRatio(pair.fg, pair.bg)
        if (ratio == null) continue
        checksRun++
        const minimum = pair.isButton ? 3 : 4.5
        if (ratio < minimum) {
          problems.push({
            title: pair.isButton ? 'Le bouton d’achat manque de contraste' : 'Le texte de votre boutique manque de contraste',
            description: `Contraste mesuré : ${ratio}:1 (couleurs réelles du thème : ${pair.fg} sur ${pair.bg}) — sous le minimum légal de ${minimum}:1. Difficile à lire en plein soleil sur mobile, et c'est une obligation européenne depuis juin 2025.`,
            impact_euros: pair.isButton ? 35 : 25,
            priority: pair.isButton ? 'medium' : 'low',
            fix_available: false,
            recommendation: `Dans l’éditeur de thème (Couleurs), foncez ou éclaircissez ${pair.isButton ? 'le bouton' : 'le texte'} pour dépasser ${minimum}:1.`,
            affected_items: [pair.label],
            capability: 'guide',
          })
        } else if (ratio >= minimum + 1.5) {
          strengths.push({
            title: pair.isButton ? 'Votre bouton d’achat est bien lisible' : 'Vos textes sont bien lisibles',
            detail: `Contraste mesuré ${ratio}:1 (${pair.label}) — au-dessus du minimum légal européen. Vérifié depuis les couleurs réelles du thème.`,
          })
        }
      }
    }
  } catch { /* thème illisible → 0 check compté */ }

  // 3-5. Structure HTML (si vitrine accessible)
  if (homeHtml) {
    checksRun += 3
    problems.push(...htmlChecks(homeHtml).problems)
  }

  return { problems, strengths: strengths.slice(0, 1), checksRun }
}
