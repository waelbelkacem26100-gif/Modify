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
  // Standalone dashboard URL. The dashboard is Clerk-protected and CANNOT run
  // inside the Shopify admin iframe (Clerk's handshake + third-party cookies
  // break there — that's why middleware excludes /shopify). So we break OUT of
  // the iframe to the top-level window. Kept in state to also render a manual
  // fallback link if the automatic breakout is blocked.
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null)

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
        const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string; claim_token?: string | null }
        if (cancelled) return
        if (res.ok && data.success) {
          // A valid offline access token was stored. Shopify offline tokens are
          // non-expiring by design — that is the correct, expected outcome and
          // exactly what the autopilot needs. No `expires_in`/`refresh_token` to wait for.
          setStatus('ok')
          setMessage('Connexion sécurisée établie. Redirection vers votre tableau de bord…')

          // Break out of the Shopify admin iframe to the standalone dashboard.
          // `window.open(url, '_top')` is the Shopify-sanctioned way to do a
          // top-level navigation from an embedded app. A brief pause lets the
          // success message render first.
          // When we have a signed claim token, go through /api/shopify/claim so
          // the Clerk user signing in claims this shop's sentinel store; that
          // route then redirects on to /dashboard.
          const url = data.claim_token
            ? `${window.location.origin}/api/shopify/claim?token=${encodeURIComponent(data.claim_token)}`
            : `${window.location.origin}/dashboard`
          setDashboardUrl(url)
          setTimeout(() => {
            if (cancelled) return
            try {
              window.open(url, '_top')
            } catch {
              window.top!.location.href = url
            }
          }, 1200)
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
          <>
            {dashboardUrl && (
              <p style={{ marginTop: 20 }}>
                <a
                  href={dashboardUrl}
                  target="_top"
                  style={{ display: 'inline-block', background: '#FF5C35', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none', padding: '10px 20px', borderRadius: 8 }}
                >
                  Ouvrir le tableau de bord Modify
                </a>
              </p>
            )}
            <p style={{ color: '#71717a', fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>
              Modify audite, corrige et améliore votre boutique chaque semaine.
              Vous recevrez un rapport par e-mail avec les revenus récupérés.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
