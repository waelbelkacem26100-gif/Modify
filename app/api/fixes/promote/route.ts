import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { promoteThemeToMain, themeHasCoreFiles, getThemes } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Fix, Audit, Store } from '@/types'

// POST: promote a Group C preview theme to live (publish it)
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
  if (store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })
  await getValidAccessToken(store, supabase)

  if (typedFix.status !== 'preview' || !typedFix.preview_theme_id) {
    return NextResponse.json(
      { error: 'Ce correctif n\'a pas de preview à promouvoir.' }, { status: 400 }
    )
  }

  try {
    // Confirm the preview theme still exists
    const themes = await getThemes(store.shop_domain, store.access_token)
    const previewExists = themes.some((t) => String(t.id) === typedFix.preview_theme_id)
    if (!previewExists) {
      await supabase.from('fixes').update({ status: 'failed', preview_theme_id: null }).eq('id', fix_id)
      return NextResponse.json(
        { error: 'Le thème preview n\'existe plus. Régénérez le correctif.', code: 'PREVIEW_GONE' },
        { status: 410 }
      )
    }

    // ── SAFETY GUARD: never publish an incomplete theme copy ──────────────
    const safe = await themeHasCoreFiles(store.shop_domain, store.access_token, typedFix.preview_theme_id!)
    if (!safe) {
      await logAction(supabase, store.id, 'promote_blocked_incomplete_theme',
        { preview_theme_id: typedFix.preview_theme_id }, 'failed', fix_id)
      return NextResponse.json({
        error: 'Promotion bloquée — le thème preview est incomplet (fichiers cœur manquants). La boutique n\'a pas été touchée.',
        code: 'PREVIEW_INCOMPLETE',
      }, { status: 422 })
    }

    // Publish the preview theme → becomes the live theme
    await promoteThemeToMain(store.shop_domain, store.access_token, typedFix.preview_theme_id!)
    await logAction(supabase, store.id, 'preview_promoted_to_live',
      { promoted_theme_id: typedFix.preview_theme_id }, 'success', fix_id)

    // The promoted theme is now the active theme
    await supabase.from('fixes').update({
      status: 'applied',
      theme_id: typedFix.preview_theme_id,
    }).eq('id', fix_id)

    return NextResponse.json({ success: true, promoted_theme_id: typedFix.preview_theme_id })
  } catch (e) {
    console.error('[promote] error:', e)
    await logAction(supabase, store.id, 'promote_error', { error: String(e) }, 'failed', fix_id)
    return NextResponse.json({ error: 'Erreur lors de la promotion du thème preview' }, { status: 502 })
  }
}
