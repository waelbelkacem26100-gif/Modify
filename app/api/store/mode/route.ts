import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { readStoreMode, type StoreMode } from '@/lib/store-mode'
import type { Store } from '@/types'

export const runtime = 'nodejs'

async function userStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as Store) ?? null
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })
  const supabase = await createServiceRoleClient()
  const store = await userStore(supabase, userId)
  return NextResponse.json({ mode: readStoreMode(store ?? {}) })
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { mode?: string }
  const mode: StoreMode = body.mode === 'approval' ? 'approval' : 'auto'

  const supabase = await createServiceRoleClient()
  const store = await userStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

  // Tolerant of the column not existing yet (pre-migration): report it instead
  // of failing the request.
  const { error } = await supabase.from('stores').update({ mode }).eq('id', store.id)
  if (error) {
    console.error('[store/mode] update failed:', error.code, error.message)
    return NextResponse.json({ mode, persisted: false })
  }
  return NextResponse.json({ mode, persisted: true })
}
