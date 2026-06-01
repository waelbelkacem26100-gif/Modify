import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getThemes, getThemeAssets, getProducts } from '@/lib/shopify'
import { auditStore } from '@/lib/anthropic'
import type { Store, Audit } from '@/types'

export const maxDuration = 300

const STALE_AUDIT_MS = 120_000 // 2 minutes

// GET — fetch latest audit, auto-fail stale ones
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) return NextResponse.json({ audit: null })

  const { data: audit } = await supabase
    .from('audits')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!audit) return NextResponse.json({ audit: null })

  // Auto-fail audits stuck in 'running' for more than 2 minutes
  if (audit.status === 'running') {
    const ageMs = Date.now() - new Date(audit.created_at).getTime()
    if (ageMs > STALE_AUDIT_MS) {
      await supabase
        .from('audits')
        .update({ status: 'failed' })
        .eq('id', audit.id)
      return NextResponse.json({ audit: { ...audit, status: 'failed' }, timedOut: true })
    }
  }

  return NextResponse.json({ audit })
}

// POST — launch new audit
export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'No store connected' }, { status: 404 })
  }

  const typedStore = store as Store

  const { data: audit, error: createError } = await supabase
    .from('audits')
    .insert({ store_id: typedStore.id, status: 'running' })
    .select()
    .single()

  if (createError || !audit) {
    return NextResponse.json({ error: 'Failed to create audit' }, { status: 500 })
  }

  const typedAudit = audit as Audit

  runAuditAsync(typedStore, typedAudit.id, supabase).catch(console.error)

  return NextResponse.json({ audit: typedAudit })
}

async function runAuditAsync(
  store: Store,
  auditId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  try {
    const themes = await getThemes(store.shop_domain, store.access_token)
    const mainTheme = themes.find((t) => t.role === 'main') ?? themes[0]

    const assets = mainTheme
      ? await getThemeAssets(store.shop_domain, store.access_token, String(mainTheme.id))
      : []

    const products = await getProducts(store.shop_domain, store.access_token, 20)

    const storeData = {
      shopDomain: store.shop_domain,
      themeName: mainTheme?.name ?? 'Unknown',
      themeFiles: assets.map((a) => a.key),
      productCount: products.length,
      sampleProducts: products.slice(0, 5).map((p) => ({
        title: p.title,
        hasDescription: Boolean(p.body_html && p.body_html.length > 50),
        imageCount: p.images?.length ?? 0,
        variantCount: p.variants?.length ?? 0,
        hasCompareAtPrice: p.variants?.some((v) => v.compare_at_price) ?? false,
      })),
    }

    const results = await auditStore(storeData)
    const totalImpact = results.reduce((s, r) => s + r.impact_euros, 0)

    await supabase
      .from('audits')
      .update({ status: 'completed', results, total_impact_euros: totalImpact })
      .eq('id', auditId)
  } catch (err) {
    console.error('Audit failed:', err)
    await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId)
  }
}
