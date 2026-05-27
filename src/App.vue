<template>
  <!-- Ensure the container has a explicit height/width or Leaflet won't render -->
  <div style="height: 500px; width: 100%;">
    <l-map
      ref="map"
      v-model:zoom="zoom"
      :center="center"
      :use-global-leaflet="false"
    >
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      />

      <l-marker :lat-lng="center">
        <l-popup>
          <div>Hello! This is a Vue 3 Leaflet popup.</div>
        </l-popup>
      </l-marker>
    </l-map>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import "leaflet/dist/leaflet.css"
import { LMap, LTileLayer, LMarker, LPopup } from "@vue-leaflet/vue-leaflet"

// Reactive map states
const zoom = ref(13)
const center = ref([47.41322, -1.219482])
</script>