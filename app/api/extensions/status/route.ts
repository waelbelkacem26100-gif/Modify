import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getThemes, getThemeAsset } from '@/lib/shopify'
import type { Store } from '@/types'

// Block handles must match the .liquid filenames in extensions/modify-blocks/blocks/
const APP_BLOCK_HANDLES = ['trust-badges', 'social-proof', 'urgency'] as const
const APP_EMBED_HANDLES = ['json-ld'] as const

function stripJsonComments(raw: string): string {
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

interface ThemeBlock { type?: string; disabled?: boolean; blocks?: Record<string, ThemeBlock> }

// True if `block` (or any nested block) is an active Modify block for `handle`.
// Shopify stores the type as e.g. "shopify://apps/modify/blocks/trust-badges/<uuid>".
function blockMatches(block: ThemeBlock, handle: string): boolean {
  if (typeof block?.type === 'string' && block.type.includes(`blocks/${handle}/`) && block.disabled !== true) {
    return true
  }
  // App blocks live one level under a section's "blocks" map
  for (const child of Object.values(block?.blocks ?? {})) {
    if (blockMatches(child, handle)) return true
  }
  return false
}

// App blocks: added inside a section in templates/product.json.
// NOTE: the raw JSON escapes slashes ("blocks\/trust-badges\/"), so we must
// JSON.parse (which unescapes them) rather than substring-match the raw text.
function appBlockActive(templateJson: string, handle: string): boolean {
  if (!templateJson) return false
  try {
    const parsed = JSON.parse(stripJsonComments(templateJson)) as {
      sections?: Record<string, ThemeBlock>
    }
    for (const section of Object.values(parsed.sections ?? {})) {
      if (blockMatches(section, handle)) return true
    }
    return false
  } catch {
    // Fallback: unescape JSON slash-escaping, then substring-match
    return templateJson.replace(/\\\//g, '/').includes(`blocks/${handle}/`)
  }
}

// App embeds: in config/settings_data.json under current.blocks, not disabled.
// Same slash-escaping caveat — parse, don't substring-match the raw text.
function appEmbedActive(settingsData: string, handle: string): boolean {
  if (!settingsData) return false
  try {
    const parsed = JSON.parse(stripJsonComments(settingsData)) as {
      current?: { blocks?: Record<string, ThemeBlock> }
    }
    for (const block of Object.values(parsed.current?.blocks ?? {})) {
      if (blockMatches(block, handle)) return true
    }
    return false
  } catch {
    return settingsData.replace(/\\\//g, '/').includes(`blocks/${handle}/`)
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
  // Refresh the expiring offline token server-side if it's near/past expiry.
  await getValidAccessToken(store, supabase)

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
