import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getThemes, updateThemeAsset } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Fix, Audit, Store } from '@/types'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()

  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  const typedStore = store as Store

  // Get all applied fixes for this store, oldest first
  const { data: audits } = await supabase
    .from('audits').select('id').eq('store_id', typedStore.id)

  if (!audits?.length) return NextResponse.json({ rolled_back: 0 })

  const auditIds = audits.map((a) => a.id)

  const { data: fixes } = await supabase
    .from('fixes')
    .select('*')
    .in('audit_id', auditIds)
    .in('status', ['applied', 'preview'])
    .order('created_at', { ascending: true }) // oldest first — gives us the true original

  if (!fixes?.length) return NextResponse.json({ rolled_back: 0 })

  const typedFixes = fixes as Fix[]

  // Resolve the active theme live — fix.theme_id may be stale (deleted theme).
  // All restores target the currently published theme.
  const themes = await getThemes(typedStore.shop_domain, typedStore.access_token)
  const activeTheme = themes.find((t) => t.role === 'main') ?? themes[0]
  if (!activeTheme) {
    return NextResponse.json({ error: 'Thème principal introuvable' }, { status: 502 })
  }
  const activeThemeId = String(activeTheme.id)

  // For each unique file_path, restore from the OLDEST fix (which has the pre-Modify original content)
  const filesSeen = new Set<string>()
  const results: Array<{ file: string; status: 'ok' | 'failed' }> = []
  const fixIds: string[] = []

  for (const fix of typedFixes) {
    if (!fix.file_path) continue
    if (filesSeen.has(fix.file_path)) continue // already restored from older fix
    filesSeen.add(fix.file_path)

    if (!fix.original_file_content) continue

    try {
      await updateThemeAsset(
        typedStore.shop_domain,
        typedStore.access_token,
        activeThemeId,
        fix.file_path,
        fix.original_file_content
      )
      results.push({ file: fix.file_path, status: 'ok' })
      await logAction(supabase, typedStore.id, 'total_rollback_file_restored',
        { file: fix.file_path }, 'success', fix.id)
    } catch (e) {
      results.push({ file: fix.file_path, status: 'failed' })
      await logAction(supabase, typedStore.id, 'total_rollback_file_failed',
        { file: fix.file_path, error: String(e) }, 'failed', fix.id)
    }

    fixIds.push(fix.id)
  }

  // Mark all applied fixes as rolled_back
  if (fixIds.length > 0) {
    const allFixIds = typedFixes.map((f) => f.id)
    await supabase
      .from('fixes')
      .update({ status: 'rolled_back' })
      .in('id', allFixIds)
  }

  await logAction(supabase, typedStore.id, 'total_rollback_complete', {
    files_restored: results.filter((r) => r.status === 'ok').length,
    files_failed: results.filter((r) => r.status === 'failed').length,
  }, 'success')

  return NextResponse.json({
    rolled_back: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'failed').length,
    details: results,
  })
}
