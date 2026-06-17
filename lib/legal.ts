/**
 * Single source of truth for Modifea's legal/company information, used across
 * the English legal pages (/terms, /privacy, /cookies, /legal, /support).
 */
export const LEGAL = {
  company: 'Modifea',
  service: 'Modify',
  founder: 'Waël Bendou',
  address: '2 rue Étienne Dolet, Romans-sur-Isère, France',
  siret: '98819114400019',
  founderEmail: 'wael@modifea.com',
  contactEmail: 'contact@modifea.com',
  site: 'https://modifea.com',
  updated: 'June 2026',
  host: {
    name: 'Vercel Inc.',
    address: '340 Pine Street, Suite 701, San Francisco, CA 94104, United States',
    site: 'https://vercel.com',
  },
} as const
