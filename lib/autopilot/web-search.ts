import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/**
 * Helper partagé d'analyse avec recherche web (tool serveur Anthropic).
 *
 * Le tool `web_search_20260209` est exécuté côté Anthropic : le modèle lance les
 * recherches lui-même et renvoie un texte cité. On gère `pause_turn` (boucle
 * serveur > 10 itérations) en relançant, et on extrait la réponse finale des
 * blocs `text`.
 *
 * Pour garder un JSON propre (les crons parsent la sortie) on n'active PAS le
 * thinking et on demande une réponse finale uniquement — ce qui limite aussi le coût.
 */
export async function webSearchAnalyze(prompt: string, opts?: { maxUses?: number; maxTokens?: number }): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  // Le tool serveur web_search_20260209 n'est pas typé dans le SDK installé mais
  // est supporté par l'API runtime — on passe par un cast.
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: opts?.maxUses ?? 4 }] as unknown as Anthropic.Tool[]
  let text = ''
  for (let i = 0; i < 4; i++) { // garde-fou anti-boucle sur pause_turn
    const res = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: opts?.maxTokens ?? 2000,
      tools,
      messages,
    })
    for (const block of res.content) {
      if (block.type === 'text') text += block.text
    }
    if ((res.stop_reason as string) === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content })
      continue
    }
    break
  }
  return text.trim()
}

/** Extrait le premier objet/tableau JSON d'une réponse (tolère le texte autour). */
export function extractJson<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const m = cleaned.match(/[[{][\s\S]*[\]}]/)
  if (!m) return null
  try { return JSON.parse(m[0]) as T } catch { return null }
}
