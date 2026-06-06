import Script from 'next/script'
import AppBridgeRefresh from './AppBridgeRefresh'

// Embedded App Bridge surface: opened inside the Shopify admin. App Bridge
// initialises from the data-api-key on the script tag, then the client component
// exchanges the session token for an expiring offline access token.
export default function ShopifyEmbedPage() {
  const apiKey = process.env.SHOPIFY_CLIENT_ID ?? ''
  return (
    <>
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={apiKey}
        strategy="beforeInteractive"
      />
      <AppBridgeRefresh />
    </>
  )
}
