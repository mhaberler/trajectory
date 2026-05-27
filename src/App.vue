<template>
  <div class="layout">
    <TrajectoryPanel />
    <div class="map-wrap">
      <l-map
        ref="map"
        v-model:zoom="zoom"
        :center="mapCenter"
        :use-global-leaflet="false"
        style="height: 100%; width: 100%;"
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
import { computed, ref } from 'vue'
import 'leaflet/dist/leaflet.css'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import TrajectoryPanel from '@/components/TrajectoryPanel.vue'
import TrajectoryLayer from '@/components/TrajectoryLayer.vue'
import AnimationControl from '@/components/AnimationControl.vue'
import { useTrajectoryStore } from '@/stores/trajectory'

const store = useTrajectoryStore()
const zoom = ref(6)

const mapCenter = computed<[number, number]>(() =>
  store.location ? [store.location.lat, store.location.lon] : [47.1, 15.2167],
)

interface LeafletClickEvent {
  latlng: { lat: number; lng: number }
}
function onMapClick(e: LeafletClickEvent) {
  store.setLocation(e.latlng.lat, e.latlng.lng)
}
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  width: 100%;
}
.map-wrap {
  flex: 1;
  position: relative;
  height: 100%;
}
</style>
