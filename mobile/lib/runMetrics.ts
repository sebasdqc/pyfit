// ─── Run Metrics Utilities ────────────────────────────────────────────────────

/**
 * Haversine distance between two GPS coordinates.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Format pace as "MM:SS /km".
 * @param secondsPerKm pace in seconds per kilometer
 */
export function formatPace(secondsPerKm: number): string {
  if (!isFinite(secondsPerKm) || secondsPerKm <= 0) return '--:-- /km'
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.floor(secondsPerKm % 60)
  const mm = String(mins).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  return `${mm}:${ss} /km`
}

/**
 * Format distance in meters to a human-readable string.
 * < 1000m → "XXX m", >= 1000m → "X.XX km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(2)} km`
}

/**
 * Format elapsed seconds to "HH:MM:SS" or "MM:SS".
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')

  if (h > 0) {
    const hh = String(h).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

interface GpsPoint {
  latitude: number
  longitude: number
  timestamp: string
}

/**
 * Calculate current pace (seconds per km) using a sliding window of recent points.
 * @param points  array of GPS points with ISO timestamp strings
 * @param windowSize  number of recent points to use (default 5)
 * @returns pace in seconds per km, or 0 if not enough data
 */
export function calculateCurrentPace(
  points: GpsPoint[],
  windowSize = 5,
): number {
  if (points.length < 2) return 0

  const recent = points.slice(-Math.max(windowSize, 2))
  if (recent.length < 2) return 0

  let totalDistance = 0
  for (let i = 1; i < recent.length; i++) {
    totalDistance += haversineDistance(
      recent[i - 1].latitude,
      recent[i - 1].longitude,
      recent[i].latitude,
      recent[i].longitude,
    )
  }

  const first = recent[0]
  const last = recent[recent.length - 1]
  const durationMs =
    new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()
  const durationSec = durationMs / 1000

  if (totalDistance < 1 || durationSec <= 0) return 0

  // seconds per km
  return (durationSec / totalDistance) * 1000
}

/** Format pace (sec/km) as speed in km/h. */
export function formatSpeed(secondsPerKm: number): string {
  if (!isFinite(secondsPerKm) || secondsPerKm <= 0) return '--'
  return `${(3600 / secondsPerKm).toFixed(1)} km/h`
}

/**
 * Estimate calories burned (kcal).
 * Uses MET method: outdoor running ≈ 9.8 MET, indoor cardio ≈ 7.0 MET.
 */
export function estimateCalories(
  elapsedSeconds: number,
  weightKg: number,
  isIndoor: boolean,
): number {
  const MET = isIndoor ? 7.0 : 9.8
  return Math.round(MET * weightKg * (elapsedSeconds / 3600))
}

/** Format kcal as "XXX kcal". */
export function formatCalories(kcal: number): string {
  return `${Math.max(0, kcal)} kcal`
}

/** Format accumulated elevation gain in meters as "+XX m". */
export function formatElevation(meters: number): string {
  return `+${Math.round(Math.max(0, meters))} m`
}
