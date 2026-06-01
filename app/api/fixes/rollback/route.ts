import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { updateThemeAsset } from '@/lib/shopify'
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

  if (store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  if (typedFix.status !== 'applied') {
    return NextResponse.json({ error: 'Fix is not applied' }, { status: 400 })
  }

  if (!typedFix.theme_id || !typedFix.file_path) {
    return NextResponse.json({ error: 'Missing theme or file information' }, { status: 400 })
  }

  // Use stored original content for a reliable full-file restore
  if (typedFix.original_file_content) {
    try {
      await updateThemeAsset(
        store.shop_domain,
        store.access_token,
        typedFix.theme_id,
        typedFix.file_path,
        typedFix.original_file_content
      )
    } catch (e) {
      console.error('Failed to rollback via Shopify API:', e)
      return NextResponse.json(
        { error: 'Erreur lors de la communication avec l\'API Shopify' },
        { status: 502 }
      )
    }
  } else {
    // Fallback: reverse replace (less reliable, kept for legacy fixes)
    if (typedFix.liquid_before && typedFix.liquid_after) {
      const { getThemeAsset } = await import('@/lib/shopify')
      try {
        const asset = await getThemeAsset(
          store.shop_domain, store.access_token, typedFix.theme_id, typedFix.file_path
        )
        if (asset?.value) {
          const restoredCode = asset.value.replace(typedFix.liquid_after, typedFix.liquid_before)
          if (restoredCode === asset.value) {
            return NextResponse.json(
              { error: 'Le rollback n\'a pas pu être appliqué — le fichier a été modifié depuis.' },
              { status: 422 }
            )
          }
          await updateThemeAsset(
            store.shop_domain, store.access_token, typedFix.theme_id, typedFix.file_path, restoredCode
          )
        }
      } catch (e) {
        console.error('Fallback rollback failed:', e)
        return NextResponse.json({ error: 'Rollback échoué' }, { status: 502 })
      }
    }
  }

  await supabase.from('fixes').update({ status: 'rolled_back' }).eq('id', fix_id)
  return NextResponse.json({ success: true })
}
