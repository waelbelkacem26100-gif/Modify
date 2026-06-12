import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getUserSubscription, planFor } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import { buildAgentContext } from '@/lib/agent-context'
import { agentChat, type AgentMessage } from '@/lib/anthropic'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

// Free/Starter get a short preview; the agent is a Pro (29€) feature.
const PREVIEW_USER_MESSAGES = 3

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { messages?: AgentMessage[]; mission_id?: string }
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12) // keep the conversation bounded
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message manquant' }, { status: 400 })
  }

  const isPro = isAdmin(userId) || planFor(await getUserSubscription(userId)) === 'pro'
  const userTurns = messages.filter((m) => m.role === 'user').length
  if (!isPro && userTurns > PREVIEW_USER_MESSAGES) {
    return NextResponse.json({
      error: 'L’assistant illimité est réservé au plan Pro (29€).',
      code: 'UPGRADE_REQUIRED',
    }, { status: 402 })
  }

  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = data as Store | null
  if (!store) return NextResponse.json({ error: 'Connectez d’abord votre boutique.' }, { status: 404 })

  try {
    await getValidAccessToken(store, supabase)
    let context = await buildAgentContext(store, supabase)

    // Chat contextualisé sur UNE mission Copilot : l'agent sait déjà de quoi
    // il s'agit (problème d'origine, contenu généré, étapes cochées).
    if (body.mission_id) {
      const { data: guide } = await supabase
        .from('guides').select('id, title, summary, status, steps')
        .eq('id', body.mission_id).eq('store_id', store.id).maybeSingle()
      if (guide) {
        const steps = (Array.isArray(guide.steps) ? guide.steps : []) as { title: string; detail: string; done?: boolean }[]
        const { data: link } = await supabase
          .from('audit_logs').select('details').eq('action', 'mission_created')
          .eq('details->>guide_id', guide.id).limit(1).maybeSingle()
        context += `\n\n═══ MISSION EN COURS (le marchand te parle DEPUIS cette mission — pas besoin de re-contextualiser) ═══
Mission : ${guide.title} — ${guide.summary}
Problème d'origine de l'audit : ${link?.details?.problem_title ?? '(inconnu)'}
Étapes (${steps.filter((s) => s.done).length}/${steps.length} faites) :
${steps.map((s, i) => `${s.done ? '✓' : '○'} ${i + 1}. ${s.title}\n   Contenu : ${s.detail.slice(0, 400)}${s.detail.length > 400 ? '…' : ''}`).join('\n')}
Ton rôle ici : aider à EXÉCUTER ces étapes (adapter un texte, répondre aux questions, débloquer), féliciter quand ça avance, et proposer la prochaine étape non cochée.`
      }
    }

    const reply = await agentChat(context, messages)
    return NextResponse.json({ reply, isPro, remaining: isPro ? null : Math.max(0, PREVIEW_USER_MESSAGES - userTurns) })
  } catch (e) {
    console.error('[agent/chat] failed for', store.shop_domain, String(e))
    return NextResponse.json({ error: 'L’assistant est momentanément indisponible. Réessayez.' }, { status: 502 })
  }
}
