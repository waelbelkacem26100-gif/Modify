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
}

export default nextConfig
