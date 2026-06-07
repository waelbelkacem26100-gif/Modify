import Script from 'next/script'
import type { Metadata } from 'next'
import AppBridgeRefresh from './AppBridgeRefresh'

const API_KEY = process.env.SHOPIFY_CLIENT_ID ?? ''

// App Bridge v4 reads the API key from this meta tag as well as the script's
// data-api-key — include both for robustness.
export function generateMetadata(): Metadata {
  return { other: { 'shopify-api-key': API_KEY } }
}

// Embedded App Bridge surface: opened inside the Shopify admin. App Bridge
// initialises, then the client component exchanges the session token for an
// expiring offline access token. (Clerk is excluded from this route.)
export default function ShopifyEmbedPage() {
  return (
    <>
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={API_KEY}
        strategy="afterInteractive"
      />
      <AppBridgeRefresh />
    </>
  )
}
