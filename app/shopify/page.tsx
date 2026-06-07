import type { Metadata } from 'next'
import AppBridgeRefresh from './AppBridgeRefresh'

const API_KEY = process.env.SHOPIFY_CLIENT_ID ?? ''

// App Bridge v4 reads the API key from this meta tag as well — belt & suspenders.
export function generateMetadata(): Metadata {
  return { other: { 'shopify-api-key': API_KEY } }
}

// Embedded App Bridge surface: opened inside the Shopify admin. App Bridge
// initialises from the script's data-api-key, then the client component
// exchanges the session token for an expiring offline access token.
// (Clerk is excluded from this route in middleware.)
export default function ShopifyEmbedPage() {
  return (
    <>
      {/* Plain script so data-api-key is present in the server HTML and loads
          early — next/script (afterInteractive) drops the attribute. */}
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" data-api-key={API_KEY} />
      <AppBridgeRefresh />
    </>
  )
}
