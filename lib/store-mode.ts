import type { Store } from '@/types'

export type StoreMode = 'auto' | 'approval'

/**
 * Resolves a store's automation mode, tolerant of the column being absent
 * (pre-migration) or null. Defaults to 'auto'.
 */
export function readStoreMode(store: Pick<Store, 'mode'> | { mode?: string | null }): StoreMode {
  return store?.mode === 'approval' ? 'approval' : 'auto'
}
