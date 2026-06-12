import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyApprovalToken } from '@/lib/approval-token'
import { applyPendingFixesForStore } from '@/lib/apply-pending'
import { getValidAccessToken } from '@/lib/shopify-token'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

function page(title: string, message: string): NextResponse {
  const dash = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/corrections`
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Modify</title></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:460px;margin:64px auto;background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:40px 32px;text-align:center;">
<div style="width:48px;height:48px;border-radius:12px;background:#FF5C35;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;color:#fff;font-weight:800;font-size:22px;">M</div>
<h1 style="font-size:20px;margin:0 0 8px;color:#18181b;">${title}</h1>
<p style="color:#52525b;font-size:15px;line-height:1.5;margin:0 0 24px;">${message}</p>
<a href="${dash}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">Voir mon dashboard</a>
</div></body></html>`
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}

// 1-click approval from the Monday email — applies all pending fixes for the
// store encoded in the signed token, without requiring a login.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return page('Lien invalide', 'Ce lien d’approbation est incorrect.')

  const claim = verifyApprovalToken(token)
  if (!claim) return page('Lien expiré', 'Ce lien n’est plus valide. Ouvrez votre dashboard pour appliquer vos correctifs.')

  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('stores').select('*').eq('id', claim.storeId).maybeSingle()
  if (!data) return page('Boutique introuvable', 'Nous n’avons pas retrouvé votre boutique.')

  const store = data as Store
  try {
    await getValidAccessToken(store, supabase)
    const { applied, failed } = await applyPendingFixesForStore(store, supabase)
    if (applied === 0 && failed === 0) {
      return page('Rien à appliquer', 'Toutes vos améliorations sont déjà en place. 🎉')
    }
    return page(
      '✅ C’est appliqué !',
      `${applied} amélioration(s) appliquée(s) sur votre boutique${failed ? `, ${failed} à réessayer depuis le dashboard` : ''}. Les changements sont visibles dès maintenant.`
    )
  } catch (e) {
    console.error('[approve] failed for', store.shop_domain, String(e))
    return page('Une erreur est survenue', 'Réessayez depuis votre dashboard.')
  }
}
