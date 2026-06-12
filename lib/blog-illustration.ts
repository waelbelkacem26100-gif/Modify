/**
 * Illustration d'article SEO via OpenAI gpt-image-1 — la SEULE génération
 * d'images IA de Modify (jamais de fausses photos produit).
 *
 * Contraintes apprises sur ce projet : la clé (sk-proj-) n'a PAS accès à
 * dall-e-3 et n'accepte pas response_format ; gpt-image-1 renvoie toujours du
 * b64_json. quality 'medium' 1024x1024 ≈ $0.04/image (loggé). Rate limit
 * 5 images/min → retry avec backoff sur 429. L'illustration n'est JAMAIS
 * bloquante : en cas d'échec, l'article est publié sans image.
 */

const COST_PER_IMAGE_USD = 0.04

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Prompt éditorial cohérent, sans texte dans l'image, lié au sujet. */
export function buildIllustrationPrompt(title: string, summary: string): string {
  const topic = `${title}. ${summary}`.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
  return `Editorial blog illustration photograph for an article about: "${topic}". ` +
    `Professional magazine photography style, natural light, shallow depth of field, warm tones, ` +
    `clean composition with copy space, realistic, high quality. ` +
    `Strictly NO text, NO words, NO letters, NO logos, NO watermark in the image.`
}

/** Generates one image as base64 PNG. Returns null on any failure (tolerant). */
export async function generateIllustration(title: string, summary: string): Promise<{ b64: string | null; costUsd: number }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    console.warn('[blog-illustration] OPENAI_API_KEY not set — article without image')
    return { b64: null, costUsd: 0 }
  }
  const prompt = buildIllustrationPrompt(title, summary)

  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'medium' }),
      })
      if (res.status === 429 && attempt < 3) {
        const body = await res.text()
        const m = body.match(/try again in ([\d.]+)s/i)
        const retryAfter = Number(res.headers.get('retry-after'))
        const waitMs = ((retryAfter > 0 ? retryAfter : m ? parseFloat(m[1]) : 15) + 1) * 1000
        console.warn(`[blog-illustration] 429 — backoff ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1})`)
        await sleep(waitMs)
        continue
      }
      if (!res.ok) {
        console.error('[blog-illustration] OpenAI error', res.status, (await res.text()).slice(0, 200))
        return { b64: null, costUsd: 0 }
      }
      const data = await res.json() as { data?: { b64_json?: string }[] }
      const b64 = data.data?.[0]?.b64_json ?? null
      if (b64) console.log(`[blog-illustration] generated (~$${COST_PER_IMAGE_USD})`)
      return { b64, costUsd: b64 ? COST_PER_IMAGE_USD : 0 }
    } catch (e) {
      console.error('[blog-illustration] threw', String(e))
      return { b64: null, costUsd: 0 }
    }
  }
  return { b64: null, costUsd: 0 }
}
