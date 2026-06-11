import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// TEMPORARY diagnostic route — fires one DALL·E 3 call server-side (with the
// Vercel OPENAI_API_KEY) and returns the exact OpenAI status + body so we can
// see why image generation fails. Guarded by a one-off token. REMOVE after use.
const DIAG_TOKEN = 'modify-dalle-diag-7f3a'

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('t') !== DIAG_TOKEN) {
    return new NextResponse('Not found', { status: 404 })
  }
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ ok: false, where: 'env', error: 'OPENAI_API_KEY absente côté serveur' })

  const keyShape = { len: key.length, prefix: key.slice(0, 8), kind: key.startsWith('sk-proj-') ? 'project' : key.startsWith('sk-') ? 'user' : 'other' }

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt: 'A simple red apple on a white background, product photo', n: 1, size: '1024x1024', quality: 'medium' }),
    })
    const text = await res.text()
    let b64len = 0, url = ''
    try { const j = JSON.parse(text); b64len = j?.data?.[0]?.b64_json?.length ?? 0; url = j?.data?.[0]?.url ?? '' } catch { /* keep raw */ }
    return NextResponse.json({
      ok: res.ok && (b64len > 0 || !!url),
      status: res.status,
      keyShape,
      b64len,
      returns: url ? 'url' : b64len > 0 ? 'b64_json' : 'none',
      url: url ? url.slice(0, 80) + '…' : '',
      body: (b64len > 0 || url) ? '(image returned — OK)' : text.slice(0, 600),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, where: 'fetch', keyShape, error: String(e) })
  }
}
