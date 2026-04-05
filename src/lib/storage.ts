// src/lib/storage.ts

import { get, set, del, keys, createStore } from 'idb-keyval'

export type RetrieveFn = <T>(key: string, options?: { signal?: AbortSignal }) => Promise<T | null>
export type PersistFn = <T>(key: string, value: T, ttl?: number) => Promise<void>

const DB_NAME = 'sigma-war-room'
const STORE_NAME = 'app-data'
const PREFIX = 'ss_idb_' as const
const CURRENT_VERSION = 3
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const MAX_RETRY = 2
const RETRY_DELAY_MS = 100

const idbStore = createStore(DB_NAME, STORE_NAME)

interface StoredValue<T> {
  data: T
  expiresAt: number
  version: number
  createdAt: number
}

const now = () => Date.now()
const isExpired = (expiresAt: number) => expiresAt < now()
const getLocalStorageKey = (key: string) => `${PREFIX}${key}`

const safeJSONParse = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const createPayload = <T>(data: T, ttlMs: number): StoredValue<T> => ({
  data,
  expiresAt: now() + ttlMs,
  version: CURRENT_VERSION,
  createdAt: now(),
})

export async function persist<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<void> {
  const payload = createPayload(value, ttlMs)

  // Try IndexedDB with retry
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      await set(key, payload, idbStore)
      if (import.meta.env.DEV) {
        console.log(`%c[storage] ✅ Persisted to IndexedDB: ${key}`, 'color: #00FF9C')
      }
      return
    } catch (err) {
      if (attempt === MAX_RETRY) {
        console.warn(`[storage] IDB failed after ${MAX_RETRY} attempts, falling back to localStorage: ${key}`, err)
      } else {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(getLocalStorageKey(key), JSON.stringify(payload))
    if (import.meta.env.DEV) {
      console.warn(`%c[storage] ⚠️ Fallback to localStorage: ${key}`, 'color: #FFD60A')
    }
  } catch (err) {
    console.error(`%c[storage] ❌ Failed to persist: ${key}`, 'color: #FF3B5C', err)
  }
}

export async function retrieve<T>(key: string, _options?: { signal?: AbortSignal }): Promise<T | null> {
  try {
    const stored = await get<StoredValue<T>>(key, idbStore)
    if (!stored) throw new Error('not found')

    if (isExpired(stored.expiresAt)) {
      await del(key, idbStore)
      return null
    }

    if (stored.version !== CURRENT_VERSION) {
      await del(key, idbStore)
      if (import.meta.env.DEV) {
        console.warn(
          `%c[storage] 🔄 Version mismatch cleared: ${key} (v${stored.version} → v${CURRENT_VERSION})`,
          'color: #00D4FF',
        )
      }
      return null
    }

    return stored.data
  } catch {
    // Fallback localStorage
    try {
      const raw = localStorage.getItem(getLocalStorageKey(key))
      if (!raw) return null

      const stored = safeJSONParse<StoredValue<T>>(raw)
      if (!stored) return null

      if (isExpired(stored.expiresAt)) {
        localStorage.removeItem(getLocalStorageKey(key))
        return null
      }

      if (stored.version !== CURRENT_VERSION) {
        localStorage.removeItem(getLocalStorageKey(key))
        if (import.meta.env.DEV) {
          console.warn(`%c[storage] 🔄 Version mismatch cleared (localStorage): ${key}`, 'color: #00D4FF')
        }
        return null
      }

      return stored.data
    } catch {
      return null
    }
  }
}

/**
 * Menghapus data dari kedua storage.
 * @param key Unique identifier
 */
export async function remove(key: string): Promise<void> {
  try {
    await del(key, idbStore)
  } catch {
    /* ignore */
  }
  localStorage.removeItem(getLocalStorageKey(key))
}

/**
 * Menghapus semua data dari kedua storage (prefix khusus).
 */
export async function clearAll(): Promise<void> {
  try {
    const allKeys = await keys(idbStore)
    await Promise.all(allKeys.map((k) => del(k, idbStore)))
  } catch {
    /* ignore */
  }

  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))

  if (import.meta.env.DEV) {
    console.log('%c[storage] 🧹 All storage cleared', 'color: #00FF9C')
  }
}

export async function exists(key: string): Promise<boolean> {
  const value = await retrieve(key)
  return value !== null
}

export async function clearExpired(): Promise<void> {
  // IDB
  try {
    const allKeys = await keys(idbStore)
    await Promise.all(
      allKeys.map(async (key) => {
        const stored = await get<StoredValue<unknown>>(key, idbStore)
        if (stored && isExpired(stored.expiresAt)) {
          await del(key, idbStore)
        }
      }),
    )
  } catch {
    /* ignore */
  }

  // localStorage
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => {
      const stored = safeJSONParse<StoredValue<unknown>>(localStorage.getItem(k))
      if (stored && isExpired(stored.expiresAt)) {
        localStorage.removeItem(k)
      }
    })

  if (import.meta.env.DEV) {
    console.log('%c[storage] 🧹 Expired entries cleared', 'color: #00D4FF')
  }
}

export async function getAllKeys(): Promise<string[]> {
  try {
    return await keys(idbStore)
  } catch {
    return []
  }
}

export async function getMeta(key: string): Promise<Omit<StoredValue<unknown>, 'data'> | null> {
  try {
    const stored = await get<StoredValue<unknown>>(key, idbStore)
    if (!stored) return null
    return {
      expiresAt: stored.expiresAt,
      createdAt: stored.createdAt,
      version: stored.version,
    }
  } catch {
    try {
      const raw = localStorage.getItem(getLocalStorageKey(key))
      const stored = safeJSONParse<StoredValue<unknown>>(raw)
      if (!stored) return null
      return {
        expiresAt: stored.expiresAt,
        createdAt: stored.createdAt,
        version: stored.version,
      }
    } catch {
      return null
    }
  }
}

export async function batchPersist<T>(
  entries: Array<[string, T, number?]>,
): Promise<void> {
  await Promise.all(entries.map(([key, value, ttl]) => persist(key, value, ttl)))
}
export async function batchRetrieve<T>(keys: string[]): Promise<(T | null)[]> {
  return Promise.all(keys.map((key) => retrieve<T>(key)))
}

export { idbStore }
