import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { optimizeStoreImages } from '@/lib/image-optimizer'
import type { Store } from '@/types'

export const maxDuration = 300

async function getStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  return (data as Store) ?? null
}

// GET: aggregate optimization stats for the dashboard
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ optimized: 0, saved_mb: 0, recent: [] })

  const { data: rows } = await supabase
    .from('image_optimizations')
    .select('product_id, original_bytes, new_bytes, saved_bytes, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const list = rows ?? []
  const savedBytes = list.reduce((s, r) => s + (r.saved_bytes ?? 0), 0)

  return NextResponse.json({
    optimized: list.length,
    saved_mb: +(savedBytes / (1024 * 1024)).toFixed(2),
    recent: list.slice(0, 10),
  })
}

// POST: run a compression pass now
export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  try {
    const summary = await optimizeStoreImages(store, supabase, 15)
    return NextResponse.json({ success: true, ...summary })
  } catch (e) {
    console.error('[images/compress] error:', e)
    return NextResponse.json({ error: 'Erreur lors de la compression des images' }, { status: 502 })
  }
}
