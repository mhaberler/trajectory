import type { WindSampleSeries } from '@/types/trajectory'

const EARTH_R = 6_371_000
const DEG = Math.PI / 180

export function isaAltitudeM(pressureHpa: number): number {
  const P0 = 1013.25
  const T0 = 288.15
  const L = 0.0065
  const R = 287.05
  const g = 9.80665
  const exponent = (R * L) / g
  return (T0 / L) * (1 - Math.pow(pressureHpa / P0, exponent))
}

export function windToUV(speed: number, dirDeg: number): { u: number; v: number } {
  const r = dirDeg * DEG
  return { u: -speed * Math.sin(r), v: -speed * Math.cos(r) }
}

export function uvToWind(u: number, v: number): { speed: number; dir: number } {
  const speed = Math.hypot(u, v)
  const dir = (Math.atan2(-u, -v) / DEG + 360) % 360
  return { speed, dir }
}

export function advance(
  lat: number,
  lon: number,
  uMs: number,
  vMs: number,
  dtSec: number,
): { lat: number; lon: number } {
  const dLat = (vMs * dtSec) / EARTH_R / DEG
  const dLon = (uMs * dtSec) / (EARTH_R * Math.cos(lat * DEG)) / DEG
  return { lat: lat + dLat, lon: lon + dLon }
}

export function haversineMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (bLat - aLat) * DEG
  const dLon = (bLon - aLon) * DEG
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.sqrt(s))
}

function at(arr: readonly number[], i: number): number {
  const v = arr[i]
  return v === undefined ? 0 : v
}

function atStr(arr: readonly string[], i: number): string {
  const v = arr[i]
  return v === undefined ? '' : v
}

export function interpolateWind(
  series: WindSampleSeries,
  timeISO: string,
): { speed: number; dir: number; altitudeM: number } {
  const t = Date.parse(timeISO)
  const times = series.times
  const n = times.length
  if (n === 0) return { speed: 0, dir: 0, altitudeM: 0 }
  const t0 = Date.parse(atStr(times, 0))
  const tN = Date.parse(atStr(times, n - 1))
  if (t <= t0) return sampleAt(series, 0)
  if (t >= tN) return sampleAt(series, n - 1)
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (Date.parse(atStr(times, mid)) <= t) lo = mid
    else hi = mid
  }
  const tLo = Date.parse(atStr(times, lo))
  const tHi = Date.parse(atStr(times, hi))
  const frac = tHi === tLo ? 0 : (t - tLo) / (tHi - tLo)
  const a = windToUV(at(series.speed, lo), at(series.dir, lo))
  const b = windToUV(at(series.speed, hi), at(series.dir, hi))
  const u = a.u + (b.u - a.u) * frac
  const v = a.v + (b.v - a.v) * frac
  const w = uvToWind(u, v)
  const altitudeM =
    at(series.geopotentialHeight, lo) +
    (at(series.geopotentialHeight, hi) - at(series.geopotentialHeight, lo)) * frac
  return { speed: w.speed, dir: w.dir, altitudeM }
}

function sampleAt(series: WindSampleSeries, i: number) {
  return {
    speed: at(series.speed, i),
    dir: at(series.dir, i),
    altitudeM: at(series.geopotentialHeight, i),
  }
}
