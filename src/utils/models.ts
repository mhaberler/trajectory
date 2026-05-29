import type { ModelId, PressureLevel, LatLon } from '@/types/trajectory'

export interface ModelMeta {
  id: ModelId
  label: string
  bbox: [number, number, number, number] | null
  levels: PressureLevel[]
}

const GFS_LEVELS: PressureLevel[] = [
  1000, 975, 950, 925, 900, 875, 850, 825, 800, 775, 750, 725, 700, 675, 650, 625, 600, 575, 550,
  525, 500, 475, 450, 425, 400, 375, 350, 325, 300, 275, 250, 225, 200, 175, 150, 125, 100, 70, 50,
  40, 30, 20, 15, 10,
]
const ECMWF_LEVELS: PressureLevel[] = [
  1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100, 50,
]
const ICON_LEVELS: PressureLevel[] = [
  1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150, 100, 70, 50, 30,
]
const ICON_D2_LEVELS: PressureLevel[] = [
  1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200,
]

export const MODELS: ModelMeta[] = [
  {
    id: 'ncep_gfs_global',
    label: 'NOAA GFS (global)',
    bbox: null,
    levels: GFS_LEVELS,
  },
  {
    id: 'ecmwf_ifs025',
    label: 'ECMWF IFS 0.25° (global)',
    bbox: null,
    levels: ECMWF_LEVELS,
  },
  {
    id: 'dwd_icon_global',
    label: 'DWD ICON (global)',
    bbox: null,
    levels: ICON_LEVELS,
  },
  {
    id: 'dwd_icon_eu',
    label: 'DWD ICON-EU (Europe)',
    bbox: [-23.5, 29.5, 45.0, 70.5],
    levels: ICON_LEVELS,
  },
  {
    id: 'dwd_icon_d2',
    label: 'DWD ICON-D2 (DACH, 2 km)',
    bbox: [-3.94, 43.18, 20.34, 58.08],
    levels: ICON_D2_LEVELS,
  },
]

export function applicableModels({ lat, lon }: LatLon): ModelMeta[] {
  return MODELS.filter((m) => {
    if (!m.bbox) return true
    const [minLon, minLat, maxLon, maxLat] = m.bbox
    return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat
  })
}

export function modelById(id: ModelId): ModelMeta | undefined {
  return MODELS.find((m) => m.id === id)
}

export function levelHue(level: number, minHpa = 10, maxHpa = 1000): number {
  if (minHpa >= maxHpa) return 0
  const clamped = Math.max(minHpa, Math.min(maxHpa, level))
  const t = (Math.log(clamped) - Math.log(minHpa)) / (Math.log(maxHpa) - Math.log(minHpa))
  return 280 - t * 280
}

export function levelColor(level: number, minHpa = 10, maxHpa = 1000): string {
  return `hsl(${levelHue(level, minHpa, maxHpa).toFixed(0)}, 75%, 45%)`
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r1 = 0,
    g1 = 0,
    b1 = 0
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0]
  else if (hp < 2) [r1, g1, b1] = [x, c, 0]
  else if (hp < 3) [r1, g1, b1] = [0, c, x]
  else if (hp < 4) [r1, g1, b1] = [0, x, c]
  else if (hp < 5) [r1, g1, b1] = [x, 0, c]
  else [r1, g1, b1] = [c, 0, x]
  const m = l - c / 2
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)]
}

export function levelColorHex(level: number, minHpa = 10, maxHpa = 1000): string {
  const [r, g, b] = hslToRgb(levelHue(level, minHpa, maxHpa), 0.75, 0.45)
  const hx = (n: number) => n.toString(16).padStart(2, '0').toUpperCase()
  return `#${hx(r)}${hx(g)}${hx(b)}`
}

const GARMIN_HUE_BUCKETS: ReadonlyArray<readonly [number, string]> = [
  [0, 'Red'],
  [30, 'DarkYellow'],
  [60, 'Yellow'],
  [90, 'DarkGreen'],
  [120, 'Green'],
  [150, 'DarkCyan'],
  [180, 'Cyan'],
  [210, 'DarkBlue'],
  [240, 'Blue'],
  [270, 'DarkMagenta'],
  [300, 'Magenta'],
  [330, 'DarkRed'],
]

export function garminColorFromHue(hue: number): string {
  const h = ((hue % 360) + 360) % 360
  let best = GARMIN_HUE_BUCKETS[0]!
  let bestD = 360
  for (const entry of GARMIN_HUE_BUCKETS) {
    const d = Math.min(Math.abs(h - entry[0]), 360 - Math.abs(h - entry[0]))
    if (d < bestD) {
      bestD = d
      best = entry
    }
  }
  return best[1]
}
