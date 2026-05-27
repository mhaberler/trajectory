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
const ECMWF_LEVELS: PressureLevel[] = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100, 50]
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

export function levelColor(level: number, minHpa = 10, maxHpa = 1000): string {
  if (minHpa >= maxHpa) return 'hsl(0, 75%, 45%)'
  const clamped = Math.max(minHpa, Math.min(maxHpa, level))
  const t =
    (Math.log(clamped) - Math.log(minHpa)) / (Math.log(maxHpa) - Math.log(minHpa))
  const hue = 280 - t * 280
  return `hsl(${hue.toFixed(0)}, 75%, 45%)`
}
