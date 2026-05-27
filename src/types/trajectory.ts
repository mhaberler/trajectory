export type ModelId =
  | 'ncep_gfs_global'
  | 'ecmwf_ifs025'
  | 'dwd_icon_global'
  | 'dwd_icon_eu'
  | 'dwd_icon_d2'

export type PressureLevel = number

export interface LatLon {
  lat: number
  lon: number
}

export interface TrajectoryPoint {
  lat: number
  lon: number
  t: string
  level: PressureLevel
  altitudeM: number
  speed: number
  dir: number
}

export type Trajectory = TrajectoryPoint[]

export interface TrajectorySettings {
  location: LatLon | null
  startTime: string
  durationHours: number
  intervalMinutes: number
  levels: PressureLevel[]
  modelId: ModelId
}

export interface WindSampleSeries {
  times: string[]
  speed: number[]
  dir: number[]
  geopotentialHeight: number[]
}

export interface WindColumn {
  lat: number
  lon: number
  hourStartISO: string
  hourCount: number
  perLevel: Record<number, WindSampleSeries>
}
