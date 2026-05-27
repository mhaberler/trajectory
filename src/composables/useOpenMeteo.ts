import type { ModelId, PressureLevel, WindColumn, WindSampleSeries } from '@/types/trajectory'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export interface GeocodeHit {
  name: string
  country?: string
  admin1?: string
  latitude: number
  longitude: number
}

export async function geocode(query: string): Promise<GeocodeHit[]> {
  if (!query.trim()) return []
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Geocoding failed: ${r.status}`)
  const j = await r.json()
  return (j.results ?? []) as GeocodeHit[]
}

export interface FetchWindOpts {
  lat: number
  lon: number
  startHourISO: string
  hours: number
  levels: PressureLevel[]
  model: ModelId
}

export async function fetchWindProfile(opts: FetchWindOpts): Promise<WindColumn> {
  const { lat, lon, startHourISO, hours, levels, model } = opts
  const vars: string[] = []
  for (const L of levels) {
    vars.push(`wind_speed_${L}hPa`, `wind_direction_${L}hPa`, `geopotential_height_${L}hPa`)
  }
  const start = new Date(startHourISO)
  const end = new Date(start.getTime() + hours * 3600 * 1000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    models: model,
    hourly: vars.join(','),
    wind_speed_unit: 'ms',
    cell_selection: 'nearest',
    timezone: 'UTC',
    start_date: fmt(start),
    end_date: fmt(end),
  })
  const url = `${FORECAST_URL}?${params.toString()}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Open-Meteo fetch failed: ${r.status} ${await r.text()}`)
  const j = await r.json()
  const hourly = j.hourly ?? {}
  const times: string[] = hourly.time ?? []
  const perLevel: Record<number, WindSampleSeries> = {}
  for (const L of levels) {
    perLevel[L] = {
      times,
      speed: hourly[`wind_speed_${L}hPa`] ?? [],
      dir: hourly[`wind_direction_${L}hPa`] ?? [],
      geopotentialHeight: hourly[`geopotential_height_${L}hPa`] ?? [],
    }
  }
  return {
    lat: j.latitude ?? lat,
    lon: j.longitude ?? lon,
    hourStartISO: times[0] ?? startHourISO,
    hourCount: times.length,
    perLevel,
  }
}
