'use client'

import { useState, useEffect, useCallback } from 'react'
import { Newspaper, Sparkles, ExternalLink, CheckCircle2, Gauge, Wand2, Bot, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Article { article_id: number; title: string; url: string; tags: string | null; created_at: string }
interface SeoProblem { id: string; title: string; count: number; impact_euros: number; severity: 'high' | 'medium' | 'low' }
interface Audit { score: number; productsAnalyzed: number; metrics: { metaTitle: number; metaDesc: number; altText: number; description: number }; problems: SeoProblem[] }
interface Applied { metasUpdated: number; altsUpdated: number; faqsGenerated: number }

const PRIO = { high: '🔴', medium: '🟠', low: '🟡' } as const

export default function SeoContent() {
  const [audit, setAudit] = useState<Audit | null>(null)
  const [applied, setApplied] = useState<Applied>({ metasUpdated: 0, altsUpdated: 0, faqsGenerated: 0 })
  const [articles, setArticles] = useState<Article[]>([])
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [fixing, setFixing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true)
    const res = await fetch('/api/seo/audit')
    if (res.ok) {
      const d = await res.json() as { audit: Audit | null; applied?: Applied }
      setAudit(d.audit)
      if (d.applied) setApplied(d.applied)
    }
    setLoadingAudit(false)
  }, [])

  const loadArticles = useCallback(async () => {
    const res = await fetch('/api/blog/generate')
    if (res.ok) setArticles(((await res.json()) as { articles: Article[] }).articles ?? [])
  }, [])

  useEffect(() => { loadAudit(); loadArticles() }, [loadAudit, loadArticles])

  async function fixAll() {
    setFixing(true); setError(''); setNote('')
    try {
      const res = await fetch('/api/seo/fix-all', { method: 'POST' })
      const d = await res.json() as { error?: string; metasUpdated?: number; altsUpdated?: number; faqsGenerated?: number }
      if (res.ok) {
        setNote(`✅ ${d.metasUpdated ?? 0} fiche(s) optimisée(s), ${d.altsUpdated ?? 0} image(s) décrite(s), ${d.faqsGenerated ?? 0} FAQ générée(s).`)
        await loadAudit()
      } else setError(d.error ?? 'Échec des corrections.')
    } finally { setFixing(false) }
  }

  async function generate() {
    setGenerating(true); setError('')
    try {
      const res = await fetch('/api/blog/generate', { method: 'POST' })
      const d = await res.json() as { error?: string }
      if (res.ok) await loadArticles()
      else setError(d.error ?? 'Erreur lors de la génération.')
    } finally { setGenerating(false) }
  }

  const score = audit?.score ?? 0
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const totalLost = (audit?.problems ?? []).reduce((s, p) => s + p.impact_euros, 0)

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">Référencement (SEO &amp; IA)</h1>
        <p className="text-text-secondary text-sm">
          Modify optimise votre boutique pour Google et pour les IA (ChatGPT, Perplexity), et publie du contenu chaque semaine.
        </p>
      </div>

      {note && <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-xl text-success text-sm">{note}</div>}
      {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">{error}</div>}

      {/* SEO score + fix-all */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 mb-6">
        {loadingAudit ? (
          <div className="flex items-center justify-center min-h-32"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : audit ? (
          <>
            <div className="flex items-center gap-5 mb-5 flex-wrap">
              <div className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #27272a 0deg)` }}>
                <div className="w-[5.25rem] h-[5.25rem] rounded-full bg-surface flex flex-col items-center justify-center">
                  <span className="font-syne font-bold text-2xl" style={{ color }}>{score}</span>
                  <span className="text-[9px] text-text-muted uppercase tracking-wide">Score SEO</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-text-muted text-sm mb-2"><Gauge className="w-4 h-4" /> Sur {audit.productsAnalyzed} produit(s) analysé(s)</div>
                {totalLost > 0 && <p className="text-text-secondary text-sm mb-3">Environ <span className="text-danger font-semibold">€{totalLost}/mois</span> de visibilité perdue.</p>}
                <Button onClick={fixAll} loading={fixing} size="md">
                  <Wand2 className="w-4 h-4" /> Tout corriger automatiquement
                </Button>
              </div>
              <button onClick={loadAudit} className="text-text-muted hover:text-text-secondary text-xs inline-flex items-center gap-1 self-start">
                <RefreshCw className="w-3.5 h-3.5" /> Relancer l’audit
              </button>
            </div>

            {audit.problems.length > 0 ? (
              <div className="space-y-2">
                {audit.problems.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 p-3 bg-surface-2 rounded-xl">
                    <p className="text-text-primary text-sm flex items-start gap-2"><span>{PRIO[p.severity]}</span> {p.title}</p>
                    <span className="text-danger text-sm font-semibold whitespace-nowrap">€{p.impact_euros}/mois</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-success text-sm">🎉 Aucun problème SEO majeur — votre boutique est bien optimisée.</p>
            )}
          </>
        ) : (
          <p className="text-text-secondary text-sm">Connectez une boutique pour lancer l’audit SEO.</p>
        )}
      </div>

      {/* Corrections applied + GEO */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-text-primary font-medium text-sm mb-3">Corrections appliquées</p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2 text-text-secondary"><CheckCircle2 className="w-4 h-4 text-success" /> {applied.metasUpdated} titres + descriptions Google</li>
            <li className="flex items-center gap-2 text-text-secondary"><CheckCircle2 className="w-4 h-4 text-success" /> {applied.altsUpdated} images décrites</li>
            <li className="flex items-center gap-2 text-text-secondary"><CheckCircle2 className="w-4 h-4 text-success" /> {applied.faqsGenerated} FAQ produit générées</li>
          </ul>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-text-primary font-medium text-sm mb-2 flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Optimisation pour les IA (GEO)</p>
          <p className="text-text-secondary text-xs leading-relaxed">
            Données structurées Schema.org sur vos produits + FAQ — pour être cité par ChatGPT et Perplexity, et apparaître en rich snippets Google.
          </p>
        </div>
      </div>

      {/* Articles */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-syne font-semibold text-text-primary flex items-center gap-2"><Newspaper className="w-5 h-5" /> Articles de blog ({articles.length})</h2>
        <Button onClick={generate} loading={generating} size="sm"><Sparkles className="w-3.5 h-3.5" /> Générer un article</Button>
      </div>
      {articles.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <Newspaper className="w-9 h-9 text-text-muted mx-auto mb-2" />
          <p className="text-text-secondary text-sm">Un article SEO de 2000+ mots est publié automatiquement chaque semaine.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <div key={a.article_id} className="bg-surface border border-border rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium">{a.title}</p>
                <p className="text-text-muted text-xs mt-1">
                  {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {a.tags && ` · ${a.tags}`}
                </p>
              </div>
              {a.url && (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-xs hover:text-primary-dark flex-shrink-0">
                  Voir <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
