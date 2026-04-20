interface CachedRoute {
  routeId: number
  waypoints: { lat: number; lng: number; name: string }[]
  isRoadSnapped: boolean
  cachedAt: Date
}

const cache = new Map<number, CachedRoute>()
const CACHE_DURATION_MS = 60 * 60 * 1000

export const getCachedRoute = (
  routeId: number
): { lat: number; lng: number; name: string }[] | null => {
  const cached = cache.get(routeId)
  if (!cached) return null

  const age = Date.now() - cached.cachedAt.getTime()
  if (age > CACHE_DURATION_MS) {
    cache.delete(routeId)
    return null
  }

  console.log(
    `Cache hit for route ${routeId} — ${cached.waypoints.length} points — road-snapped: ${cached.isRoadSnapped}`
  )
  return cached.waypoints
}

export const setCachedRoute = (
  routeId: number,
  waypoints: { lat: number; lng: number; name: string }[],
  isRoadSnapped: boolean = false
): void => {
  cache.set(routeId, {
    routeId,
    waypoints,
    isRoadSnapped,
    cachedAt: new Date()
  })
  console.log(
    `Route ${routeId} cached — ${waypoints.length} points — road-snapped: ${isRoadSnapped}`
  )
}

export const clearCache = (): void => {
  cache.clear()
}

export const clearRouteCache = (routeId: number): void => {
  cache.delete(routeId)
  console.log(`Cache cleared for route ${routeId}`)
}