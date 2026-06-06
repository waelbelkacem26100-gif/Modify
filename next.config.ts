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
