'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import ModyAvatar from '@/components/brand/ModyAvatar'
import CopilotMissions from '@/components/dashboard/CopilotMissions'
import { MODY_OPEN_EVENT, type ModyOpenDetail } from '@/lib/mody-companion'

interface Props {
  isPro: boolean
  hasAccess: boolean
}

/**
 * 💜 Compagnon Mody (v6) — présence persistante sur tout le dashboard.
 *
 * Monté dans le layout : ne se démonte pas en naviguant entre 🏠 et 📊, donc le
 * panneau reste ouvert et garde sa mission en cours. Deux points d'entrée :
 *  - bouton flottant générique (en bas à droite) → liste des 4 métiers
 *  - événement `mody:open` (bandeau / carte problème) → mission contextualisée
 *
 * La pastille de notification s'appuie sur le VRAI nombre de missions (GET
 * /api/copilot/missions, sans LLM) comparé à ce que l'utilisateur a déjà vu.
 */
export default function ModyCompanion({ isPro, hasAccess }: Props) {
  const [open, setOpen] = useState(false)
  const [missionTitle, setMissionTitle] = useState<string | null>(null)
  const [missionCount, setMissionCount] = useState(0)
  const [seen, setSeen] = useState(true)
  // Force le remontage de CopilotMissions quand on ouvre sur une autre mission,
  // pour que le deep-link prenne effet même si le panneau était déjà monté.
  const mountKey = useRef(0)

  // Écoute l'ouverture déclenchée n'importe où dans l'app.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ModyOpenDetail>).detail
      mountKey.current += 1
      setMissionTitle(detail?.missionTitle ?? null)
      setOpen(true)
      setSeen(true)
    }
    window.addEventListener(MODY_OPEN_EVENT, handler)
    // Deep-link ?mody=1 (depuis le guide de démarrage) → ouvre Mody.
    if (new URLSearchParams(window.location.search).get('mody') === '1') {
      mountKey.current += 1
      setOpen(true); setSeen(true)
    }
    return () => window.removeEventListener(MODY_OPEN_EVENT, handler)
  }, [])

  // Pastille : missions disponibles non encore consultées (localStorage).
  useEffect(() => {
    let alive = true
    fetch('/api/copilot/missions')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { missions?: unknown[] } | null) => {
        if (!alive || !d?.missions) return
        const n = d.missions.length
        setMissionCount(n)
        const lastSeen = Number(localStorage.getItem('mody-seen-count') || '0')
        setSeen(n <= lastSeen)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const openGeneric = useCallback(() => {
    mountKey.current += 1
    setMissionTitle(null)
    setOpen(true)
    setSeen(true)
    localStorage.setItem('mody-seen-count', String(missionCount))
  }, [missionCount])

  const close = useCallback(() => setOpen(false), [])

  // Esc ferme le panneau
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <>
      {/* Bouton flottant — toujours visible, identité violette Mody */}
      {!open && (
        <button
          onClick={openGeneric}
          aria-label="Ouvrir Mody, votre copilote"
          /* bottom-[72px] sur mobile : au-dessus de la bottom-nav (≈52px) ; bottom-6 sur desktop.
             v9 — fond gradient vert Mody + lueur pulsée. */
          className="fixed bottom-[72px] right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full bg-gradient-to-br from-mody to-mody-dark border border-mody-bright/40 animate-pulse-glow hover:scale-105 transition-transform duration-200 group"
        >
          <span className="relative">
            <ModyAvatar size={36} />
            {!seen && missionCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-mody-dark" />
            )}
          </span>
          <span className="font-display font-semibold text-sm text-white">
            Mody
          </span>
        </button>
      )}

      {/* Panneau — drawer latéral (desktop) / plein écran (mobile) */}
      {open && (
        <>
          <div
            onClick={close}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-[fadeUp_0.2s_ease-out]"
            aria-hidden
          />
          <aside
            className="fixed z-50 bg-surface border-mody/20 flex flex-col
                       inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[440px] md:border-l
                       animate-[fadeUp_0.25s_ease-out]"
            role="dialog"
            aria-label="Mody, votre copilote"
          >
            {/* En-tête — signature violette */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-gradient-to-r from-mody-glow to-transparent">
              <ModyAvatar size={38} />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-text-primary leading-tight">Mody</p>
                <p className="text-[11px] text-text-muted leading-tight">Votre copilote — Contenu, Réputation, Vidéo & Social, Stratégie</p>
              </div>
              <button
                onClick={close}
                aria-label="Fermer"
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps — réutilise le copilote 4 métiers, contextualisé.
                overflow-y-auto + min-h-0 : le contenu (missions + messages) scrolle
                à l'intérieur du drawer, l'en-tête reste fixe. overscroll-contain
                évite que le scroll « fuie » vers la page derrière l'overlay. */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth">
              <CopilotMissions
                key={mountKey.current}
                isPro={isPro}
                hasAccess={hasAccess}
                initialMissionTitle={missionTitle}
              />
            </div>
          </aside>
        </>
      )}
    </>
  )
}
