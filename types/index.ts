export interface Store {
  id: string
  user_id: string
  shop_domain: string
  access_token: string
  shop_name: string | null
  plan: string | null
  created_at: string
}

export interface Audit {
  id: string
  store_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results: AuditResult[] | null
  total_impact_euros: number | null
  created_at: string
}

export interface AuditResult {
  id: string
  category: 'theme' | 'product' | 'trust' | 'speed' | 'checkout'
  title: string
  description: string
  impact_euros: number
  priority: 'high' | 'medium' | 'low'
  fix_available: boolean
  recommendation: string
}

export interface Fix {
  id: string
  audit_id: string
  type: string
  title: string
  description: string
  impact_euros: number
  status: 'pending' | 'applied' | 'rolled_back'
  liquid_before: string | null
  liquid_after: string | null
  file_path: string | null
  theme_id: string | null
  backup_theme_id: string | null
  created_at: string
}

export interface Conversion {
  id: string
  store_id: string
  date: string
  conversion_rate: number
  revenue: number
  sessions: number
}

export type PriorityLevel = 'high' | 'medium' | 'low'
export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed'
export type FixStatus = 'pending' | 'applied' | 'rolled_back'
export type IssueCategory = 'theme' | 'product' | 'trust' | 'speed' | 'checkout'
