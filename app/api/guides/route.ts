import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getThemes, getProductsDetailed } from '@/lib/shopify'
import { generateGuide, type GuideType, type GuideContext } from '@/lib/anthropic'
import type { Store } from '@/types'

export const maxDuration = 120

const VALID_TYPES: GuideType[] = ['photos', 'theme_ux', 'marketing', 'products']

async function getStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  const store = (data as Store) ?? null
  // Refresh the expiring offline token server-side before any Shopify call.
  if (store) await getValidAccessToken(store, supabase)
  return store
}

// GET: list this store's guides
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ guides: [] })

  const { data: guides } = await supabase
    .from('guides').select('*').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(50)

  return NextResponse.json({ guides: guides ?? [] })
}

// POST: generate a guide of a given type
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { type?: GuideType }
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'Invalid guide type' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  try {
    const [themes, products, snap] = await Promise.all([
      getThemes(store.shop_domain, store.access_token),
      getProductsDetailed(store.shop_domain, store.access_token, 50),
      supabase.from('store_score_snapshots').select('score, recovered_euros')
        .eq('store_id', store.id).order('created_at', { ascending: false }).limit(1).single(),
    ])

    const themeName = (themes.find((t) => t.role === 'main') ?? themes[0])?.name ?? 'Inconnu'
    const types = new Set<string>(), tags = new Set<string>()
    for (const p of products) {
      if (p.product_type) types.add(p.product_type)
      for (const t of (p.tags || '').split(',').map((s) => s.trim()).filter(Boolean)) tags.add(t)
    }
    const weakPhoto = products
      .filter((p) => (p.images?.length ?? 0) < 3 || (p.images ?? []).some((i) => !i.alt?.trim()))
      .map((p) => p.title)

    const ctx: GuideContext = {
      shopName: store.shop_name ?? store.shop_domain,
      niche: [...types, ...tags].slice(0, 12).join(', ') || 'e-commerce généraliste',
      themeName,
      productExamples: products.map((p) => p.title).slice(0, 8),
      weakPhotoProducts: weakPhoto,
      score: snap.data?.score ?? 0,
      recoveredEuros: Number(snap.data?.recovered_euros ?? 0),
    }

    const guide = await generateGuide(body.type, ctx)

    const { data: saved, error } = await supabase.from('guides').insert({
      store_id: store.id,
      type: body.type,
      title: guide.title,
      impact_euros: guide.impact_euros,
      summary: guide.summary,
      steps: guide.steps,
      status: 'todo',
    }).select().single()

    if (error) return NextResponse.json({ error: 'Failed to save guide' }, { status: 500 })
    return NextResponse.json({ success: true, guide: saved })
  } catch (e) {
    console.error('[guides] generate error:', e)
    return NextResponse.json({ error: 'Erreur lors de la génération du guide' }, { status: 502 })
  }
}

// PATCH: toggle a guide's status (todo/done) OR a single step's done state.
// La checklist par étape est persistée DANS le jsonb `steps` existant
// (chaque étape gagne un booléen `done`) — zéro migration.
export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    guide_id?: string; status?: 'todo' | 'done'; step_index?: number; done?: boolean
  }
  if (!body.guide_id) {
    return NextResponse.json({ error: 'guide_id required' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return new NextResponse('Forbidden', { status: 403 })

  // Coche/décoche UNE étape → état persisté ; le guide passe "done" tout seul
  // quand toutes les étapes sont cochées.
  if (typeof body.step_index === 'number') {
    const { data: guide } = await supabase
      .from('guides').select('steps').eq('id', body.guide_id).eq('store_id', store.id).single()
    if (!guide) return NextResponse.json({ error: 'Guide introuvable' }, { status: 404 })
    const steps = (Array.isArray(guide.steps) ? guide.steps : []) as { title: string; detail: string; done?: boolean }[]
    if (body.step_index < 0 || body.step_index >= steps.length) {
      return NextResponse.json({ error: 'step_index invalide' }, { status: 400 })
    }
    steps[body.step_index] = { ...steps[body.step_index], done: Boolean(body.done) }
    const allDone = steps.length > 0 && steps.every((s) => s.done)
    await supabase.from('guides')
      .update({ steps, status: allDone ? 'done' : 'todo', completed_at: allDone ? new Date().toISOString() : null })
      .eq('id', body.guide_id).eq('store_id', store.id)
    return NextResponse.json({ success: true, steps, status: allDone ? 'done' : 'todo' })
  }

  if (!body.status) return NextResponse.json({ error: 'status required' }, { status: 400 })
  await supabase.from('guides')
    .update({ status: body.status, completed_at: body.status === 'done' ? new Date().toISOString() : null })
    .eq('id', body.guide_id).eq('store_id', store.id)

  return NextResponse.json({ success: true })
}
