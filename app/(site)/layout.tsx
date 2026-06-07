import { ClerkProvider } from '@clerk/nextjs'

// Clerk-authenticated surface (landing, auth, dashboard, legal). Kept separate
// from /shopify, which loads embedded in the Shopify admin where Clerk's JS
// (third-party cookies / handshake redirects) must NOT run.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>
}
