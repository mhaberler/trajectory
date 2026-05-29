import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { LatLon, ModelId, PressureLevel, Trajectory, WindColumn } from '@/types/trajectory'
import { fetchWindProfile } from '@/composables/useOpenMeteo'
import { computeTrajectory, type WindSampler } from '@/composables/useTrajectory'
import { interpolateWind } from '@/utils/geo'
import { haversineMeters } from '@/utils/geo'

function toLocalHour(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
}

const STORAGE_KEY = 'trajectory.settings.v1'

interface Persisted {
  location: LatLon | null
  durationHours: number
  intervalMinutes: number
  levels: PressureLevel[]
  modelId: ModelId
  minPressureHpa: number
}

function loadPersisted(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<Persisted>
  } catch {
    return {}
  }
}

export const useTrajectoryStore = defineStore('trajectory', () => {
  const p = loadPersisted()
  const location = ref<LatLon | null>(p.location ?? { lat: 47.1, lon: 15.2167 })
  const startTime = ref<string>(toLocalHour(new Date()))
  const durationHours = ref<number>(p.durationHours ?? 2)
  const intervalMinutes = ref<number>(p.intervalMinutes ?? 15)
  const levels = ref<PressureLevel[]>(p.levels ?? [850, 500, 300])
  const modelId = ref<ModelId>(p.modelId ?? 'ncep_gfs_global')
  const minPressureHpa = ref<number>(p.minPressureHpa ?? 500)

  const trajectories = ref<Record<number, Trajectory>>({})
  const computing = ref(false)
  const error = ref<string | null>(null)
  const currentTimeMs = ref<number>(Date.now())
  const suppressMapClickUntil = ref<number>(0)
  const panelOpen = ref<boolean>(true)

  const startTimeISO = computed(() => new Date(startTime.value).toISOString())
  const endTimeISO = computed(() =>
    new Date(Date.parse(startTimeISO.value) + durationHours.value * 3600 * 1000).toISOString(),
  )

  function setLocation(lat: number, lon: number) {
    location.value = { lat, lon }
    trajectories.value = {}
  }

  function toggleLevel(L: PressureLevel) {
    const idx = levels.value.indexOf(L)
    if (idx >= 0) levels.value.splice(idx, 1)
    else levels.value.push(L)
    levels.value.sort((a, b) => b - a)
  }

  async function compute() {
    if (!location.value) {
      error.value = 'Pick a location first'
      return
    }
    if (levels.value.length === 0) {
      error.value = 'Pick at least one pressure level'
      return
    }
    error.value = null
    computing.value = true
    try {
      const columns: WindColumn[] = []
      const initial = await fetchWindProfile({
        lat: location.value.lat,
        lon: location.value.lon,
        startHourISO: startTimeISO.value,
        hours: durationHours.value + 1,
        levels: levels.value,
        model: modelId.value,
      })
      columns.push(initial)

      const sampler: WindSampler = async (lat, lon, timeISO, level) => {
        let best: WindColumn = initial
        let bestD = haversineMeters(lat, lon, best.lat, best.lon)
        for (const c of columns) {
          const d = haversineMeters(lat, lon, c.lat, c.lon)
          if (d < bestD) {
            best = c
            bestD = d
          }
        }
        if (bestD > 25_000) {
          const extra = await fetchWindProfile({
            lat,
            lon,
            startHourISO: startTimeISO.value,
            hours: durationHours.value + 1,
            levels: levels.value,
            model: modelId.value,
          })
          columns.push(extra)
          best = extra
        }
        const series = best.perLevel[level]
        if (!series) return { speed: 0, dir: 0, altitudeM: 0 }
        return interpolateWind(series, timeISO)
      }

      const results: Record<number, Trajectory> = {}
      for (const L of levels.value) {
        results[L] = await computeTrajectory({
          start: location.value,
          startTimeISO: startTimeISO.value,
          durationSec: durationHours.value * 3600,
          intervalSec: intervalMinutes.value * 60,
          level: L,
          sampler,
        })
      }
      trajectories.value = results
      currentTimeMs.value = Date.parse(startTimeISO.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      computing.value = false
    }
  }

  watch(
    [location, durationHours, intervalMinutes, levels, modelId, minPressureHpa],
    () => {
      const data: Persisted = {
        location: location.value,
        durationHours: durationHours.value,
        intervalMinutes: intervalMinutes.value,
        levels: levels.value,
        modelId: modelId.value,
        minPressureHpa: minPressureHpa.value,
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        // ignore quota / privacy mode
      }
    },
    { deep: true },
  )

  return {
    location,
    startTime,
    durationHours,
    intervalMinutes,
    levels,
    modelId,
    minPressureHpa,
    trajectories,
    computing,
    error,
    currentTimeMs,
    suppressMapClickUntil,
    panelOpen,
    startTimeISO,
    endTimeISO,
    setLocation,
    toggleLevel,
    compute,
  }
})
