import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getThemes, getThemeAsset, updateThemeAsset } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Fix, Audit, Store } from '@/types'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { fix_id: string }
  const { fix_id } = body

  const supabase = await createServiceRoleClient()

  const { data: fix } = await supabase
    .from('fixes').select('*, audits(*, stores(*))').eq('id', fix_id).single()

  if (!fix) return NextResponse.json({ error: 'Fix not found' }, { status: 404 })

  const typedFix = fix as Fix & { audits: Audit & { stores: Store } }
  const store = typedFix.audits.stores
  await getValidAccessToken(store, supabase)

  if (store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  if (!['applied', 'preview'].includes(typedFix.status)) {
    return NextResponse.json({ error: 'Ce correctif n\'est pas appliqué' }, { status: 400 })
  }

  if (!typedFix.file_path) {
    return NextResponse.json({ error: 'Informations de thème manquantes' }, { status: 400 })
  }

  try {
    // Resolve the active (main) theme live — fix.theme_id may point to a
    // deleted theme, so always restore onto the currently published theme.
    const themes = await getThemes(store.shop_domain, store.access_token)
    const activeTheme = themes.find((t) => t.role === 'main') ?? themes[0]
    if (!activeTheme) {
      return NextResponse.json({ error: 'Thème principal introuvable sur cette boutique' }, { status: 502 })
    }
    const activeThemeId = String(activeTheme.id)

    if (typedFix.backup_theme_id && typedFix.file_path) {
      // Priority 1: restore from Shopify backup theme (full file, exact state)
      const backupAsset = await getThemeAsset(
        store.shop_domain, store.access_token, typedFix.backup_theme_id, typedFix.file_path
      )

      if (!backupAsset?.value) {
        return NextResponse.json(
          { error: 'Fichier de backup introuvable dans le thème de sauvegarde' },
          { status: 404 }
        )
      }

      await updateThemeAsset(
        store.shop_domain, store.access_token, activeThemeId, typedFix.file_path, backupAsset.value
      )
      await logAction(supabase, store.id, 'rollback_from_backup_theme',
        { file: typedFix.file_path, theme_id: activeThemeId }, 'success', fix_id)

    } else if (typedFix.original_file_content) {
      // Priority 2: restore from DB-stored original content
      await updateThemeAsset(
        store.shop_domain, store.access_token, activeThemeId, typedFix.file_path,
        typedFix.original_file_content
      )
      await logAction(supabase, store.id, 'rollback_from_db_snapshot',
        { file: typedFix.file_path, theme_id: activeThemeId }, 'success', fix_id)

    } else {
      return NextResponse.json(
        { error: 'Aucun backup disponible pour ce correctif' },
        { status: 400 }
      )
    }
  } catch (e) {
    console.error('Rollback failed:', e)
    await logAction(supabase, store.id, 'rollback_failed', { error: String(e) }, 'failed', fix_id)
    return NextResponse.json({ error: "Erreur de communication avec l'API Shopify" }, { status: 502 })
  }

  await supabase.from('fixes').update({ status: 'rolled_back' }).eq('id', fix_id)
  await logAction(supabase, store.id, 'rollback_complete', { fix_id }, 'success', fix_id)

  return NextResponse.json({ success: true })
}
