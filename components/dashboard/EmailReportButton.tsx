'use client'

import { useState } from 'react'
import { Mail, Check } from 'lucide-react'

export default function EmailReportButton() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function send() {
    setState('sending')
    setMsg('')
    try {
      const res = await fetch('/api/email/test', { method: 'POST' })
      const data = await res.json() as { email?: string; error?: string }
      if (res.ok) {
        setState('sent')
        setMsg(data.email ? `Envoyé à ${data.email}` : 'Envoyé')
        setTimeout(() => setState('idle'), 4000)
      } else {
        setState('error')
        setMsg(data.error ?? 'Erreur')
      }
    } catch {
      setState('error')
      setMsg('Erreur réseau')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={send}
        disabled={state === 'sending'}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 text-xs sm:text-sm font-medium transition-colors disabled:opacity-60"
      >
        {state === 'sent' ? <Check className="w-3.5 h-3.5 text-success" /> : <Mail className="w-3.5 h-3.5" />}
        {state === 'sending' ? 'Envoi…' : state === 'sent' ? 'Aperçu envoyé' : 'Aperçu email'}
      </button>
      {msg && (
        <span className={`text-[10px] ${state === 'error' ? 'text-danger' : 'text-text-muted'}`}>{msg}</span>
      )}
    </div>
  )
}
