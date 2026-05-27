<template>
  <l-rectangle
    v-if="bboxBounds"
    :bounds="bboxBounds"
    :color="'#1976d2'"
    :weight="2"
    :dash-array="'6 6'"
    :fill="false"
  />
  <template v-for="(traj, level) in store.trajectories" :key="level">
    <l-polyline
      :lat-lngs="latLngsFor(traj)"
      :color="levelColor(Number(level), store.minPressureHpa)"
      :weight="3"
      :opacity="0.8"
    />
    <l-circle-marker
      v-if="markerFor(traj)"
      :lat-lng="markerFor(traj)!"
      :radius="6"
      :color="levelColor(Number(level), store.minPressureHpa)"
      :fill-color="levelColor(Number(level), store.minPressureHpa)"
      :fill-opacity="1"
    >
      <l-popup>
        <div>
          <strong>{{ level }} hPa</strong><br />
          {{ popupFor(traj) }}
        </div>
      </l-popup>
    </l-circle-marker>
  </template>
  <l-marker
    v-if="store.location"
    :lat-lng="[store.location.lat, store.location.lon]"
  >
    <l-popup>Launch point</l-popup>
  </l-marker>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LPolyline, LCircleMarker, LMarker, LPopup, LRectangle } from '@vue-leaflet/vue-leaflet'
import { useTrajectoryStore } from '@/stores/trajectory'
import { levelColor, modelById } from '@/utils/models'
import type { Trajectory } from '@/types/trajectory'

const store = useTrajectoryStore()

const bboxBounds = computed<[[number, number], [number, number]] | null>(() => {
  const m = modelById(store.modelId)
  if (!m?.bbox) return null
  const [minLon, minLat, maxLon, maxLat] = m.bbox
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ]
})

function latLngsFor(traj: Trajectory): [number, number][] {
  return traj.map((p) => [p.lat, p.lon])
}

function markerFor(traj: Trajectory): [number, number] | null {
  if (traj.length === 0) return null
  const tMs = store.currentTimeMs
  let lo = 0
  for (let i = 0; i < traj.length; i++) {
    const item = traj[i]
    if (item && Date.parse(item.t) <= tMs) lo = i
    else break
  }
  const hi = Math.min(lo + 1, traj.length - 1)
  const a = traj[lo]
  const b = traj[hi]
  if (!a || !b) return null
  if (a === b) return [a.lat, a.lon]
  const tA = Date.parse(a.t)
  const tB = Date.parse(b.t)
  const frac = tB === tA ? 0 : Math.max(0, Math.min(1, (tMs - tA) / (tB - tA)))
  return [a.lat + (b.lat - a.lat) * frac, a.lon + (b.lon - a.lon) * frac]
}

function popupFor(traj: Trajectory): string {
  if (traj.length === 0) return ''
  const tMs = store.currentTimeMs
  let best = traj[0]!
  let bestD = Math.abs(Date.parse(best.t) - tMs)
  for (const p of traj) {
    const d = Math.abs(Date.parse(p.t) - tMs)
    if (d < bestD) {
      best = p
      bestD = d
    }
  }
  return `${new Date(best.t).toISOString().slice(0, 16)}Z, ${Math.round(best.altitudeM)} m, ${best.speed.toFixed(1)} m/s @ ${Math.round(best.dir)}°`
}
</script>
