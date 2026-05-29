<template>
  <div class="layout" :class="{ 'panel-open': store.panelOpen }">
    <button
      class="panel-toggle"
      :title="store.panelOpen ? 'Hide panel' : 'Show panel'"
      @click="store.panelOpen = !store.panelOpen"
    >
      {{ store.panelOpen ? '◀' : '▶' }}
    </button>
    <TrajectoryPanel v-if="store.panelOpen" />
    <div class="map-wrap">
      <button
        class="locate-btn"
        :disabled="locating"
        :title="locating ? 'Locating…' : 'Use my location'"
        @click="locate"
      >
        ⌖
      </button>
      <button class="recenter-btn" :disabled="!hasData" title="Fit trajectories" @click="recenter">
        ⛶
      </button>
      <div v-if="locateError" class="locate-err">{{ locateError }}</div>
      <l-map
        ref="mapRef"
        v-model:zoom="zoom"
        :center="mapCenter"
        :use-global-leaflet="false"
        style="height: 100%; width: 100%"
        @click="onMapClick"
      >
        <l-tile-layer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          layer-type="base"
          name="OpenStreetMap"
        />
        <TrajectoryLayer />
      </l-map>
      <AnimationControl />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import 'leaflet/dist/leaflet.css'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import TrajectoryPanel from '@/components/TrajectoryPanel.vue'
import TrajectoryLayer from '@/components/TrajectoryLayer.vue'
import AnimationControl from '@/components/AnimationControl.vue'
import { useTrajectoryStore } from '@/stores/trajectory'

const store = useTrajectoryStore()
const zoom = ref(6)
const locating = ref(false)
const locateError = ref<string | null>(null)
interface LeafletMap {
  invalidateSize: () => void
  fitBounds: (b: [number, number][], opts?: { padding?: [number, number] }) => void
}
const mapRef = ref<{ leafletObject?: LeafletMap } | null>(null)

watch(
  () => store.panelOpen,
  async () => {
    await nextTick()
    setTimeout(() => mapRef.value?.leafletObject?.invalidateSize(), 50)
  },
)

const mapCenter = computed<[number, number]>(() =>
  store.location ? [store.location.lat, store.location.lon] : [47.1, 15.2167],
)

const hasData = computed(() => Object.keys(store.trajectories).length > 0)

function recenter() {
  const bounds: [number, number][] = []
  if (store.location) bounds.push([store.location.lat, store.location.lon])
  for (const traj of Object.values(store.trajectories)) {
    for (const p of traj) bounds.push([p.lat, p.lon])
  }
  if (bounds.length === 0) return
  mapRef.value?.leafletObject?.fitBounds(bounds, { padding: [40, 40] })
}

interface LeafletClickEvent {
  latlng: { lat: number; lng: number }
}
function onMapClick(e: LeafletClickEvent) {
  if (Date.now() < store.suppressMapClickUntil) return
  store.setLocation(e.latlng.lat, e.latlng.lng)
}

function locate() {
  if (!navigator.geolocation) {
    locateError.value = 'Geolocation not supported'
    return
  }
  locating.value = true
  locateError.value = null
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      store.setLocation(pos.coords.latitude, pos.coords.longitude)
      zoom.value = Math.max(zoom.value, 10)
      locating.value = false
    },
    (err) => {
      locateError.value = err.message
      locating.value = false
      setTimeout(() => (locateError.value = null), 4000)
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}
.map-wrap {
  flex: 1;
  position: relative;
  height: 100%;
  min-width: 0;
}
@media (max-width: 600px) {
  .layout.panel-open .map-wrap {
    display: none;
  }
}
.panel-toggle {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 2000;
  width: 36px;
  height: 36px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.locate-btn {
  position: absolute;
  top: 12px;
  left: 52px;
  z-index: 1000;
  width: 32px;
  height: 32px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  font-size: 18px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.locate-btn:disabled {
  opacity: 0.6;
}
.recenter-btn {
  position: absolute;
  top: 12px;
  left: 92px;
  z-index: 1000;
  width: 32px;
  height: 32px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.recenter-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.locate-err {
  position: absolute;
  top: 50px;
  left: 12px;
  z-index: 1000;
  background: #fdd;
  color: #900;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  max-width: 240px;
}
</style>
