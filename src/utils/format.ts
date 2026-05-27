import type { Trajectory, TrajectoryPoint } from '@/types/trajectory'
import { haversineMeters } from '@/utils/geo'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

const MS_TO_KMH = 3.6

export function formatPoint(p: TrajectoryPoint): string {
  const d = new Date(p.t)
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  return `${hm} UTC · ${Math.round(p.altitudeM)} m · ${(p.speed * MS_TO_KMH).toFixed(1)} km/h @ ${Math.round(p.dir)}°`
}

export function formatPointFull(p: TrajectoryPoint): string {
  const d = new Date(p.t)
  const day = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  return `${day} ${hm}Z · ${Math.round(p.altitudeM)} m · ${(p.speed * MS_TO_KMH).toFixed(1)} km/h @ ${Math.round(p.dir)}°`
}

export function formatTrajectorySummary(traj: Trajectory): string {
  if (traj.length === 0) return ''
  const first = traj[0]!
  const last = traj[traj.length - 1]!
  let distM = 0
  let speedSum = 0
  let altMin = first.altitudeM
  let altMax = first.altitudeM
  for (let i = 0; i < traj.length; i++) {
    const p = traj[i]!
    speedSum += p.speed
    if (p.altitudeM < altMin) altMin = p.altitudeM
    if (p.altitudeM > altMax) altMax = p.altitudeM
    if (i > 0) {
      const prev = traj[i - 1]!
      distM += haversineMeters(prev.lat, prev.lon, p.lat, p.lon)
    }
  }
  const meanSpeed = speedSum / traj.length
  const t0 = new Date(first.t)
  const t1 = new Date(last.t)
  const t0s = `${pad(t0.getUTCHours())}:${pad(t0.getUTCMinutes())}Z`
  const t1s = `${pad(t1.getUTCHours())}:${pad(t1.getUTCMinutes())}Z`
  return [
    `${first.level} hPa`,
    `${t0s} → ${t1s}`,
    `${(distM / 1000).toFixed(1)} km, mean ${(meanSpeed * MS_TO_KMH).toFixed(1)} km/h`,
    `alt ${Math.round(altMin)}–${Math.round(altMax)} m`,
  ].join('<br>')
}
