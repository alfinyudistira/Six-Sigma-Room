import { get, set, del, keys, createStore } from 'idb-keyval'

async function retry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (retries <= 0) throw e
    return retry(fn, retries - 1)
  }
}

const idbStore = createStore('sigma-war-room', 'app-data')

const TTL_MS = 1000 * 60 * 60 * 24 * 30

interface StoredValue<T> {
  data: T
  expiresAt: number
  version: number
}

const CURRENT_VERSION = 2

export async function persist<T>(key: string, value: T, ttlMs = TTL_MS): Promise<void> {
  const payload: StoredValue<T> = {
    data: value,
    expiresAt: Date.now() + ttlMs,
    version: CURRENT_VERSION,
  }
  try {
    await retry(() => set(key, payload, idbStore))
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem(`ss_idb_${key}`, JSON.stringify(payload))
    } catch {
      console.warn('[storage] Failed to persist:', key)
    }
  }
}

export async function retrieve<T>(key: string): Promise<T | null> {
  try {
    const stored = await get<StoredValue<T>>(key, idbStore)
    if (!stored) throw new Error('not found in idb')
    if (stored.expiresAt < Date.now()) {
      await del(key, idbStore)
      return null
    }
    if (stored.version !== CURRENT_VERSION) {
      await del(key, idbStore)
      return null
    }
    return stored.data
  } catch {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(`ss_idb_${key}`)
      if (!raw) return null
      const stored: StoredValue<T> = JSON.parse(raw)
      if (stored.expiresAt < Date.now()) {
        localStorage.removeItem(`ss_idb_${key}`)
        return null
      }
      return stored.data
    } catch {
      return null
    }
  }
}

export async function remove(key: string): Promise<void> {
  try { await del(key, idbStore) } catch { /* noop */ }
  localStorage.removeItem(`ss_idb_${key}`)
}

export async function clearAll(): Promise<void> {
  try {
    const allKeys = await keys(idbStore)
    await Promise.all(allKeys.map(k => del(k, idbStore)))
  } catch { /* noop */ }
  // Clear localStorage fallback entries
  Object.keys(localStorage)
    .filter(k => k.startsWith('ss_'))
    .forEach(k => localStorage.removeItem(k))
}
