import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getThemes, getThemeAsset } from '@/lib/shopify'
import type { Store } from '@/types'

// Block handles must match the .liquid filenames in extensions/modify-blocks/blocks/
const APP_BLOCK_HANDLES = ['trust-badges', 'social-proof', 'urgency'] as const
const APP_EMBED_HANDLES = ['json-ld'] as const

function stripJsonComments(raw: string): string {
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

// App blocks: present in a template's section blocks → considered active.
function appBlockActive(templateJson: string, handle: string): boolean {
  return templateJson.includes(`blocks/${handle}/`)
}

// App embeds: present in settings_data current.blocks AND not disabled.
function appEmbedActive(settingsData: string, handle: string): boolean {
  const marker = `/blocks/${handle}/`
  if (!settingsData.includes(marker)) return false
  try {
    const parsed = JSON.parse(stripJsonComments(settingsData)) as {
      current?: { blocks?: Record<string, { type?: string; disabled?: boolean }> }
    }
    const blocks = parsed.current?.blocks ?? {}
    for (const key of Object.keys(blocks)) {
      const b = blocks[key]
      if (typeof b?.type === 'string' && b.type.includes(marker)) {
        return b.disabled !== true
      }
    }
    return false
  } catch {
    // Tolerant fallback: present but couldn't parse the disabled flag
    return true
  }
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()

  if (!storeRow) return NextResponse.json({ connected: false, blocks: {} })
  const store = storeRow as Store

  try {
    const themes = await getThemes(store.shop_domain, store.access_token)
    const active = themes.find((t) => t.role === 'main') ?? themes[0]
    if (!active) return NextResponse.json({ connected: false, blocks: {} })
    const themeId = String(active.id)

    // Read the two files that record block activation (GET works fine — only
    // WRITES are blocked by Shopify, so detection is fully reliable).
    const [productTpl, settingsData] = await Promise.all([
      getThemeAsset(store.shop_domain, store.access_token, themeId, 'templates/product.json').catch(() => null),
      getThemeAsset(store.shop_domain, store.access_token, themeId, 'config/settings_data.json').catch(() => null),
    ])

    const tplJson = productTpl?.value ?? ''
    console.log('[DEBUG tplJson]', tplJson.slice(0, 500))
    const settJson = settingsData?.value ?? ''

    const blocks: Record<string, boolean> = {}
    for (const h of APP_BLOCK_HANDLES) blocks[h] = appBlockActive(tplJson, h)
    for (const h of APP_EMBED_HANDLES) blocks[h] = appEmbedActive(settJson, h)

    return NextResponse.json({
      connected: true,
      theme_id: themeId,
      theme_name: active.name,
      theme_editor_url: `https://${store.shop_domain}/admin/themes/${themeId}/editor?template=product`,
      app_embeds_url: `https://${store.shop_domain}/admin/themes/${themeId}/editor?context=apps`,
      blocks,
    })
  } catch (e) {
    console.error('[extensions/status] error:', e)
    return NextResponse.json({ connected: false, blocks: {}, error: 'theme_read_failed' }, { status: 502 })
  }
}
