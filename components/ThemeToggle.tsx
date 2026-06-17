'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

/**
 * 🌙/☀️ Bascule dark/light (v10.1).
 *
 * La classe `.dark` est posée sur <html> AVANT le paint par un script inline
 * (cf. app/layout.tsx) — ici on se contente de la lire au montage puis de la
 * basculer. Persistance : localStorage clé `modifyTheme`. Priorité au montage :
 * localStorage > préférence système (gérée par le script inline).
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try { localStorage.setItem('modifyTheme', next) } catch { /* stockage indisponible */ }
    setTheme(next)
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      className={[
        'inline-flex items-center justify-center w-9 h-9 rounded-xl text-text-secondary',
        'hover:text-text-primary hover:bg-surface-2 transition-colors',
        className,
      ].join(' ')}
    >
      {/* Avant montage : icône neutre (évite tout mismatch d'hydratation). */}
      {!mounted ? (
        <Moon className="w-[18px] h-[18px]" />
      ) : theme === 'dark' ? (
        <Sun className="w-[18px] h-[18px]" />
      ) : (
        <Moon className="w-[18px] h-[18px]" />
      )}
    </button>
  )
}
