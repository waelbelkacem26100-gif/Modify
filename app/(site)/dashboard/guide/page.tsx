import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Sparkles, LineChart, ArrowRight } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase-server'
import type { Store, Audit } from '@/types'
import type { Problem } from '@/lib/audit/types'

// F5 — Guide de démarrage : 3 priorités personnalisées basées sur les vraies données.
export default async function GuidePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = storeRow as Store | null
  if (!store) redirect('/dashboard')

  const { data: auditRow } = await supabase
    .from('audits').select('*').eq('store_id', store.id).eq('status', 'completed')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const audit = auditRow as Audit | null
  const problems = (audit?.results ?? []) as Problem[]
  const urgentCount = problems.filter((p) => p.priority === 'high').length
  const missionCount = problems.filter((p) => (p.capability ?? (p.fix_available ? 'auto' : 'guide')) === 'guide').length

  const steps = [
    {
      icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30',
      title: 'Corriger d’abord',
      body: urgentCount > 0
        ? `Vous avez ${urgentCount} problème${urgentCount > 1 ? 's' : ''} urgent${urgentCount > 1 ? 's' : ''}. Commencez par là — ce sont eux qui vous coûtent le plus.`
        : 'Aucune urgence détectée — vous pouvez passer directement à l’étape suivante.',
      cta: { label: urgentCount > 0 ? 'Voir les urgences' : 'Voir le tableau de bord', href: '/dashboard' },
    },
    {
      icon: Sparkles, color: 'text-mody-bright', bg: 'bg-mody/10', border: 'border-mody/30',
      title: 'Faire avec Mody',
      body: missionCount > 0
        ? `${missionCount} mission${missionCount > 1 ? 's' : ''} vous attend${missionCount > 1 ? 'ent' : ''} : Mody génère les briefs photo, emails d’avis et scripts vidéo, prêts à l’emploi.`
        : 'Mody est prêt à vous aider dès qu’une mission se présente.',
      cta: { label: 'Ouvrir Mody', href: '/dashboard?mody=1' },
    },
    {
      icon: LineChart, color: 'text-primary-bright', bg: 'bg-primary/10', border: 'border-primary/30',
      title: 'Mesurer dans 2 semaines',
      body: 'Revenez dans 2 semaines : vous verrez l’impact réel de vos corrections sur vos conversions et votre score.',
      cta: { label: 'Voir Impact & Résultats', href: '/dashboard/resultats' },
    },
  ]

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-syne font-extrabold text-2xl sm:text-3xl text-text-primary mb-2">Par où commencer ?</h1>
        <p className="text-text-secondary text-sm">Votre plan en 3 étapes, basé sur les résultats réels de votre boutique.</p>
      </div>

      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className={`flex gap-4 bg-surface border ${s.border} rounded-2xl p-5`}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-syne font-bold text-text-muted text-sm">Étape {i + 1}</span>
                <h2 className="font-semibold text-text-primary">{s.title}</h2>
              </div>
              <p className="text-text-secondary text-sm mb-3">{s.body}</p>
              <Link href={s.cta.href} className={`inline-flex items-center gap-1.5 text-sm font-medium ${s.color} hover:opacity-80 transition-opacity`}>
                {s.cta.label} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
