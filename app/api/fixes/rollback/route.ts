import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getThemeAsset, updateThemeAsset } from '@/lib/shopify'
import type { Fix, Audit, Store } from '@/types'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { fix_id: string }
  const { fix_id } = body

  const supabase = await createServiceRoleClient()

  const { data: fix } = await supabase
    .from('fixes')
    .select('*, audits(*, stores(*))')
    .eq('id', fix_id)
    .single()

  if (!fix) return NextResponse.json({ error: 'Fix not found' }, { status: 404 })

  const typedFix = fix as Fix & { audits: Audit & { stores: Store } }
  const store = typedFix.audits.stores

  if (store.user_id !== userId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (typedFix.status !== 'applied') {
    return NextResponse.json({ error: 'Fix is not applied' }, { status: 400 })
  }

  // Restore the original code
  if (typedFix.theme_id && typedFix.file_path && typedFix.liquid_before && typedFix.liquid_after) {
    try {
      const asset = await getThemeAsset(
        store.shop_domain,
        store.access_token,
        typedFix.theme_id,
        typedFix.file_path
      )

      if (asset?.value) {
        const restoredCode = asset.value.replace(typedFix.liquid_after, typedFix.liquid_before)
        await updateThemeAsset(
          store.shop_domain,
          store.access_token,
          typedFix.theme_id,
          typedFix.file_path,
          restoredCode
        )
      }
    } catch (e) {
      console.error('Failed to rollback in Shopify:', e)
    }
  }

  await supabase.from('fixes').update({ status: 'rolled_back' }).eq('id', fix_id)

  return NextResponse.json({ success: true })
}
