import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { generateAndPublishArticle } from '@/lib/blog-generator'
import type { Store } from '@/types'

export const maxDuration = 120

async function getStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  return (data as Store) ?? null
}

// GET: list previously generated articles
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ articles: [] })

  const { data: articles } = await supabase
    .from('blog_articles')
    .select('article_id, title, url, tags, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ articles: articles ?? [] })
}

// POST: generate + publish one article now
export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  try {
    const result = await generateAndPublishArticle(store, supabase)
    if (!result.created) {
      return NextResponse.json({ error: 'Aucun blog disponible sur la boutique' }, { status: 422 })
    }
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('[blog/generate] error:', e)
    return NextResponse.json({ error: 'Erreur lors de la génération de l\'article' }, { status: 502 })
  }
}
