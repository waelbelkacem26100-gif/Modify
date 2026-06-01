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

  if (store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })
  if (typedFix.status !== 'applied') {
    return NextResponse.json({ error: 'Fix is not applied' }, { status: 400 })
  }
  if (!typedFix.theme_id || !typedFix.file_path) {
    return NextResponse.json({ error: 'Missing theme or file information' }, { status: 400 })
  }

  try {
    if (typedFix.backup_theme_id) {
      // Priority: restore from Shopify backup theme (full file, unambiguous)
      const backupAsset = await getThemeAsset(
        store.shop_domain,
        store.access_token,
        typedFix.backup_theme_id,
        typedFix.file_path
      )

      if (!backupAsset?.value) {
        return NextResponse.json(
          { error: 'Le fichier de backup n\'est plus disponible dans le thème de sauvegarde' },
          { status: 404 }
        )
      }

      await updateThemeAsset(
        store.shop_domain,
        store.access_token,
        typedFix.theme_id,
        typedFix.file_path,
        backupAsset.value
      )
    } else if (typedFix.original_file_content) {
      // Fallback: restore from DB-stored original content
      await updateThemeAsset(
        store.shop_domain,
        store.access_token,
        typedFix.theme_id,
        typedFix.file_path,
        typedFix.original_file_content
      )
    } else {
      return NextResponse.json(
        { error: 'Aucun backup disponible pour ce correctif' },
        { status: 400 }
      )
    }
  } catch (e) {
    console.error('Rollback failed:', e)
    return NextResponse.json(
      { error: 'Erreur lors de la communication avec l\'API Shopify' },
      { status: 502 }
    )
  }

  await supabase.from('fixes').update({ status: 'rolled_back' }).eq('id', fix_id)
  return NextResponse.json({ success: true })
}
