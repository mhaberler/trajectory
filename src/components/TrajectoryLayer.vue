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
      @click="onLineClick"
    >
      <l-popup>
        <div v-html="summaryFor(traj)" />
      </l-popup>
    </l-polyline>

    <l-circle-marker
      v-for="(p, i) in traj"
      :key="`step-${level}-${i}`"
      :lat-lng="[p.lat, p.lon]"
      :radius="2"
      :color="levelColor(Number(level), store.minPressureHpa)"
      :fill-color="levelColor(Number(level), store.minPressureHpa)"
      :fill-opacity="0.6"
      :opacity="0.6"
      :weight="1"
    >
      <l-tooltip :options="{ sticky: true, direction: 'top' }">
        {{ formatPoint(p) }}
      </l-tooltip>
    </l-circle-marker>

    <l-circle-marker
      v-for="(p, i) in hourlyPoints(traj)"
      :key="`hour-${level}-${i}`"
      :lat-lng="[p.lat, p.lon]"
      :radius="5"
      :color="levelColor(Number(level), store.minPressureHpa)"
      :fill-color="levelColor(Number(level), store.minPressureHpa)"
      :fill-opacity="1"
      :weight="2"
    >
      <l-tooltip :options="{ direction: 'top' }">
        {{ formatPointFull(p) }}
      </l-tooltip>
    </l-circle-marker>

    <l-circle-marker
      v-if="cursorPointFor(traj)"
      :lat-lng="cursorPointFor(traj)!"
      :radius="7"
      :color="'#000'"
      :fill-color="levelColor(Number(level), store.minPressureHpa)"
      :fill-opacity="1"
      :weight="2"
    />
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
import {
  LPolyline,
  LCircleMarker,
  LMarker,
  LPopup,
  LTooltip,
  LRectangle,
} from '@vue-leaflet/vue-leaflet'
import { useTrajectoryStore } from '@/stores/trajectory'
import { levelColor, modelById } from '@/utils/models'
import { formatPoint, formatPointFull, formatTrajectorySummary } from '@/utils/format'
import type { Trajectory, TrajectoryPoint } from '@/types/trajectory'

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

function hourlyPoints(traj: Trajectory): TrajectoryPoint[] {
  return traj.filter((p) => {
    const d = new Date(p.t)
    return d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
  })
}

function cursorPointFor(traj: Trajectory): [number, number] | null {
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

function summaryFor(traj: Trajectory): string {
  return formatTrajectorySummary(traj)
}

interface LeafletMouseEvent {
  originalEvent?: { stopPropagation?: () => void; preventDefault?: () => void }
}
function onLineClick(e: LeafletMouseEvent) {
  store.suppressMapClickUntil = Date.now() + 250
  e.originalEvent?.stopPropagation?.()
}
</script>
