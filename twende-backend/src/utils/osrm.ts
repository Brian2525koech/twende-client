// src/utils/osrm.ts
import http from 'http'
import https from 'https'

interface Point {
  lat: number
  lng: number
}

export interface Stop {
  lat: number | string
  lng: number | string
  name: string
}

const OSRM = 'https://router.project-osrm.org'

const fetchURL = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http

    const req = lib.get(url, (res) => {
      if (
        (res.statusCode === 301 || res.statusCode === 302) &&
        res.headers.location
      ) {
        return resolve(fetchURL(res.headers.location))
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }

      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
      res.on('error', reject)
    })

    req.on('error', reject)
    req.setTimeout(15000, () => {
      req.destroy()
      reject(new Error('OSRM request timed out'))
    })
  })

const snapToRoad = async (point: Point): Promise<Point> => {
  try {
    const url = `${OSRM}/nearest/v1/driving/${point.lng},${point.lat}`
    const raw = await fetchURL(url)
    const json = JSON.parse(raw)

    if (!json.waypoints?.length) return point

    const [lng, lat] = json.waypoints[0].location
    console.log(
      `Snapped (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}) → (${lat.toFixed(5)}, ${lng.toFixed(5)})`
    )
    return { lat, lng }
  } catch {
    return point
  }
}

const getRoadPathBetweenTwoPoints = async (
  start: Point,
  end: Point
): Promise<Point[]> => {
  const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`
  const url =
    `${OSRM}/route/v1/driving/${coords}` +
    `?overview=full` +
    `&geometries=geojson` +
    `&steps=false` +
    `&alternatives=false` +
    `&continue_straight=true`

  try {
    const raw = await fetchURL(url)
    const json = JSON.parse(raw)

    if (json.code !== 'Ok' || !json.routes?.[0]?.geometry?.coordinates?.length) {
      console.warn(`OSRM segment failed: code=${json.code}`)
      return [start, end]
    }

    const points: Point[] = json.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => ({ lat, lng })
    )

    const km = (json.routes[0].distance / 1000).toFixed(1)
    const min = Math.round(json.routes[0].duration / 60)
    console.log(`  Segment: ${points.length} points, ${km}km, ~${min}min`)

    return points
  } catch (err: any) {
    console.warn(`Segment routing error: ${err.message}`)
    return [start, end]
  }
}

/**
 * THIS IS THE KEY FUNCTION.
 * 
 * It only uses the FIRST and LAST stop to get the road geometry.
 * The middle stops are ONLY used as markers on the map — they do NOT
 * affect the road path. This prevents OSRM from making detours.
 * 
 * For very long routes (highway routes like Bomet-Kericho), it uses
 * a small number of evenly-spaced anchor points to keep OSRM on the
 * main road without causing branch detours at town centres.
 */
export const getFullRoutePath = async (
  stops: Stop[]
): Promise<{ lat: number; lng: number; name: string }[]> => {
  if (stops.length < 2) {
    return stops.map((s) => ({
      lat: Number(s.lat),
      lng: Number(s.lng),
      name: s.name,
    }))
  }

  const toPoint = (s: Stop): Point => ({
    lat: Number(s.lat),
    lng: Number(s.lng),
  })

  const firstStop = toPoint(stops[0])
  const lastStop = toPoint(stops[stops.length - 1])

  console.log(`\nBuilding road path: "${stops[0].name}" → "${stops[stops.length - 1].name}"`)
  console.log(`Total stops: ${stops.length} (only using start + end for road geometry)`)

  try {
    console.log('Snapping start and end to nearest road...')
    const [snappedStart, snappedEnd] = await Promise.all([
      snapToRoad(firstStop),
      snapToRoad(lastStop),
    ])

    console.log('Fetching road path from OSRM...')
    let roadPoints = await getRoadPathBetweenTwoPoints(snappedStart, snappedEnd)

    if (roadPoints.length <= 2) {
      console.warn('OSRM returned only 2 points — likely straight line. Trying http fallback...')
      
      const httpUrl =
        `http://router.project-osrm.org/route/v1/driving/` +
        `${snappedStart.lng},${snappedStart.lat};${snappedEnd.lng},${snappedEnd.lat}` +
        `?overview=full&geometries=geojson&steps=false&alternatives=false&continue_straight=true`

      try {
        const raw = await fetchURL(httpUrl)
        const json = JSON.parse(raw)
        if (json.code === 'Ok' && json.routes?.[0]?.geometry?.coordinates?.length > 2) {
          roadPoints = json.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng })
          )
          console.log(`http fallback succeeded: ${roadPoints.length} points`)
        }
      } catch {
        console.warn('http fallback also failed')
      }
    }

    console.log(`Road path complete: ${roadPoints.length} waypoints\n`)

    return roadPoints.map((p, i) => ({
      lat: p.lat,
      lng: p.lng,
      name:
        i === 0
          ? stops[0].name
          : i === roadPoints.length - 1
          ? stops[stops.length - 1].name
          : `road_point_${i}`,
    }))
  } catch (err: any) {
    console.warn(`getFullRoutePath failed: ${err.message} — using straight line`)
    return stops.map((s) => ({
      lat: Number(s.lat),
      lng: Number(s.lng),
      name: s.name,
    }))
  }
}