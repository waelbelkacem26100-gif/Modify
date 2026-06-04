'use client'

import { useState, useEffect, useCallback } from 'react'
import { Newspaper, Sparkles, ExternalLink, CheckCircle2, CalendarClock } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Article {
  article_id: number
  title: string
  url: string
  tags: string | null
  created_at: string
}

export default function SeoContent() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const fetchArticles = useCallback(async () => {
    const res = await fetch('/api/blog/generate')
    if (res.ok) {
      const data = await res.json() as { articles: Article[] }
      setArticles(data.articles ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/blog/generate', { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        await fetchArticles()
      } else {
        setError(data.error ?? 'Erreur inconnue')
      }
    } finally {
      setGenerating(false)
    }
  }

  const estimatedImpact = articles.length * 40

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-syne font-bold text-xl sm:text-2xl text-text-primary mb-1">Contenu SEO</h1>
          <p className="text-text-secondary text-sm">
            Modify publie un article de blog optimisé SEO chaque semaine — trafic organique en pilote automatique.
          </p>
        </div>
        <Button onClick={generate} loading={generating} size="md">
          <Sparkles className="w-4 h-4" />
          Générer un article
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <Newspaper className="w-3.5 h-3.5" /> Articles publiés
          </div>
          <p className="font-syne font-bold text-lg text-text-primary">{articles.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <CalendarClock className="w-3.5 h-3.5" /> Cadence
          </div>
          <p className="font-syne font-bold text-lg text-primary">1 / semaine</p>
        </div>
        <div className="bg-surface border border-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Valeur SEO estimée
          </div>
          <p className="font-syne font-bold text-lg text-success">€{estimatedImpact}/mois</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">{error}</div>
      )}

      {/* Article list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-32">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Newspaper className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucun article encore</h3>
          <p className="text-text-secondary text-sm">
            Cliquez « Générer un article » ou attendez la publication automatique hebdomadaire.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <div key={a.article_id} className="bg-surface border border-border rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium">{a.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-text-muted text-xs">
                    {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {a.tags && <span className="text-text-muted text-xs">· {a.tags}</span>}
                </div>
              </div>
              {a.url && (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary text-xs hover:text-primary-dark transition-colors flex-shrink-0"
                >
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
