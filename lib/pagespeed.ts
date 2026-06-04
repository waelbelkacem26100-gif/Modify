// Google PageSpeed Insights (Lighthouse) integration.

export type PageSpeedStrategy = 'mobile' | 'desktop'

export interface PageSpeedOpportunity {
  id: string
  title: string
  savingsMs: number
}

export interface PageSpeedResult {
  url: string
  strategy: PageSpeedStrategy
  score: number // 0–100 performance score
  lcpMs: number
  cls: number
  tbtMs: number
  fcpMs: number
  speedIndexMs: number
  ttiMs: number
  opportunities: PageSpeedOpportunity[]
}

interface LighthouseAudit {
  numericValue?: number
  details?: { type?: string; overallSavingsMs?: number }
  title?: string
}

function num(audits: Record<string, LighthouseAudit>, key: string): number {
  return Math.round(audits[key]?.numericValue ?? 0)
}

/** Runs PageSpeed Insights for a URL. Returns null on any error/timeout so the
 * caller (audit) never fails because of a slow Lighthouse run. */
export async function runPageSpeed(
  url: string,
  strategy: PageSpeedStrategy = 'mobile'
): Promise<PageSpeedResult | null> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY
  if (!key) {
    console.warn('[pagespeed] GOOGLE_PAGESPEED_API_KEY not set')
    return null
  }

  const endpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&key=${key}&strategy=${strategy}&category=performance`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000)
    const res = await fetch(endpoint, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      console.error('[pagespeed] HTTP', res.status, (await res.text()).slice(0, 200))
      return null
    }

    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } }
        audits?: Record<string, LighthouseAudit>
      }
    }
    const lr = data.lighthouseResult
    const scoreRaw = lr?.categories?.performance?.score
    if (lr?.audits == null || scoreRaw == null) return null
    const audits = lr.audits

    const opportunities: PageSpeedOpportunity[] = Object.entries(audits)
      .filter(([, a]) => a.details?.type === 'opportunity' && (a.details?.overallSavingsMs ?? 0) > 0)
      .map(([id, a]) => ({ id, title: a.title ?? id, savingsMs: Math.round(a.details!.overallSavingsMs!) }))
      .sort((a, b) => b.savingsMs - a.savingsMs)
      .slice(0, 6)

    return {
      url,
      strategy,
      score: Math.round(scoreRaw * 100),
      lcpMs: num(audits, 'largest-contentful-paint'),
      cls: +(audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3),
      tbtMs: num(audits, 'total-blocking-time'),
      fcpMs: num(audits, 'first-contentful-paint'),
      speedIndexMs: num(audits, 'speed-index'),
      ttiMs: num(audits, 'interactive'),
      opportunities,
    }
  } catch (e) {
    console.error('[pagespeed] error:', String(e))
    return null
  }
}

/**
 * Transparent €/month estimate from a performance score. Conversion research
 * (Deloitte/Google) puts ~0.6–1% conversion loss per 0.1s of extra load and a
 * sharp drop-off below ~90 mobile score. We map the gap to 90 onto a modest
 * recoverable revenue figure so the merchant always sees money, not a score.
 */
export function pageSpeedImpactEuros(score: number, baselineMonthlyRevenue = 5000): number {
  if (score >= 90) return 0
  const gap = 90 - score // points below "good"
  // ~0.4% recoverable revenue per point below 90, capped at 20%
  const pct = Math.min(gap * 0.004, 0.2)
  return Math.round(baselineMonthlyRevenue * pct)
}
