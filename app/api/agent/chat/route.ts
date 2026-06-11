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

  const body = await request.json().catch(() => ({})) as { messages?: AgentMessage[] }
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
    const context = await buildAgentContext(store, supabase)
    const reply = await agentChat(context, messages)
    return NextResponse.json({ reply, isPro, remaining: isPro ? null : Math.max(0, PREVIEW_USER_MESSAGES - userTurns) })
  } catch (e) {
    console.error('[agent/chat] failed for', store.shop_domain, String(e))
    return NextResponse.json({ error: 'L’assistant est momentanément indisponible. Réessayez.' }, { status: 502 })
  }
}
