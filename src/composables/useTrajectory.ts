import type { PressureLevel, Trajectory, TrajectoryPoint } from '@/types/trajectory'
import { advance, haversineMeters, windToUV } from '@/utils/geo'

export interface WindSample {
  speed: number
  dir: number
  altitudeM: number
}

export type WindSampler = (
  lat: number,
  lon: number,
  timeISO: string,
  level: PressureLevel,
) => Promise<WindSample>

export interface ComputeOpts {
  start: { lat: number; lon: number }
  startTimeISO: string
  durationSec: number
  intervalSec: number
  level: PressureLevel
  sampler: WindSampler
  refetchKmThreshold?: number
  onRefetch?: (lat: number, lon: number, timeISO: string) => void
}

export async function computeTrajectory(opts: ComputeOpts): Promise<Trajectory> {
  const {
    start,
    startTimeISO,
    durationSec,
    intervalSec,
    level,
    sampler,
    refetchKmThreshold = 25,
    onRefetch,
  } = opts
  const points: TrajectoryPoint[] = []
  let lat = start.lat
  let lon = start.lon
  const t0Ms = Date.parse(startTimeISO)
  const tEndMs = t0Ms + durationSec * 1000
  let tMs = t0Ms
  let lastFetchLat = lat
  let lastFetchLon = lon
  const seed = await sampler(lat, lon, new Date(tMs).toISOString(), level)
  points.push({
    lat,
    lon,
    t: new Date(tMs).toISOString(),
    level,
    altitudeM: seed.altitudeM,
    speed: seed.speed,
    dir: seed.dir,
  })

  while (tMs < tEndMs) {
    const tIso = new Date(tMs).toISOString()
    const w1 = await sampler(lat, lon, tIso, level)
    const uv1 = windToUV(w1.speed, w1.dir)
    const half = advance(lat, lon, uv1.u, uv1.v, intervalSec / 2)
    const tMidIso = new Date(tMs + (intervalSec * 1000) / 2).toISOString()
    const w2 = await sampler(half.lat, half.lon, tMidIso, level)
    const uv2 = windToUV(w2.speed, w2.dir)
    const next = advance(lat, lon, uv2.u, uv2.v, intervalSec)
    tMs += intervalSec * 1000
    lat = next.lat
    lon = next.lon
    if (haversineMeters(lat, lon, lastFetchLat, lastFetchLon) > refetchKmThreshold * 1000) {
      lastFetchLat = lat
      lastFetchLon = lon
      onRefetch?.(lat, lon, new Date(tMs).toISOString())
    }
    points.push({
      lat,
      lon,
      t: new Date(tMs).toISOString(),
      level,
      altitudeM: w2.altitudeM,
      speed: w2.speed,
      dir: w2.dir,
    })
  }
  return points
}
