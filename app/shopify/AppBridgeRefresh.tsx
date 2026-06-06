'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    shopify?: { idToken: () => Promise<string> }
  }
}

// Loaded inside the Shopify admin iframe (App Bridge). Gets a session token and
// exchanges it for an expiring offline token via /api/shopify/token-exchange.
export default function AppBridgeRefresh() {
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working')
  const [message, setMessage] = useState('Connexion à votre boutique Shopify…')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Wait for App Bridge to inject window.shopify
        let tries = 0
        while (!window.shopify?.idToken && tries < 60) {
          await new Promise((r) => setTimeout(r, 100))
          tries++
        }
        if (!window.shopify?.idToken) {
          if (!cancelled) { setStatus('error'); setMessage('App Bridge indisponible — ouvrez Modify depuis l\'admin Shopify.') }
          return
        }

        const token = await window.shopify.idToken()
        const res = await fetch('/api/shopify/token-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_token: token }),
        })
        const data = await res.json().catch(() => ({})) as { error?: string }
        if (cancelled) return
        if (res.ok) {
          setStatus('ok')
          setMessage('Connexion sécurisée établie. Modify entretient votre boutique en pilote automatique.')
        } else {
          setStatus('error')
          setMessage(data.error ?? 'Échec de la connexion.')
        }
      } catch (e) {
        if (!cancelled) { setStatus('error'); setMessage('Erreur : ' + String(e).slice(0, 120)) }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const color = status === 'ok' ? '#16a34a' : status === 'error' ? '#dc2626' : '#FF5C35'
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FF5C35', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>M</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Modify</h1>
        <p style={{ color, fontSize: 15, lineHeight: 1.5 }}>{message}</p>
        {status === 'ok' && (
          <p style={{ color: '#71717a', fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>
            Modify audite, corrige et améliore votre boutique chaque semaine.
            Vous recevrez un rapport par e-mail avec les revenus récupérés.
          </p>
        )}
      </div>
    </div>
  )
}
