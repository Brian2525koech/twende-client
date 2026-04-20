// src/utils/memCache.ts
//
// Lightweight in-memory TTL cache.
// Avoids hammering Neon on endpoints that are polled every few seconds.
//
// Usage:
//   memSet('platform_stats', payload, 10_000)   // cache for 10s
//   const hit = memGet<PlatformStats>('platform_stats')
//   memDel('admin_routes')                       // invalidate on mutation

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function memGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

export function memSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function memDel(key: string): void {
  store.delete(key)
}

export function memClear(): void {
  store.clear()
}