import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // sharp ships a native binary — keep it external so it isn't bundled
  // (bundling breaks the .node addon in serverless functions)
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: '*.myshopify.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/dashboard/audit', destination: '/dashboard', permanent: true },
      { source: '/dashboard/tracking', destination: '/dashboard/resultats', permanent: true },
      { source: '/dashboard/guides', destination: '/dashboard/accompagnement', permanent: true },
      { source: '/dashboard/corrections', destination: '/dashboard/fixes', permanent: true },
      { source: '/dashboard/resultats/preuves', destination: '/dashboard/resultats#galerie-impact', permanent: true },
    ]
  },
  // Allow the embedded App Bridge surface to be framed by the Shopify admin.
  async headers() {
    return [
      {
        source: '/shopify',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors https://admin.shopify.com https://*.myshopify.com;',
          },
        ],
      },
    ]
  },
}

export default nextConfig
