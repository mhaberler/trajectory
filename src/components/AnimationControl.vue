<template>
  <div v-if="hasData" class="anim">
    <button @click="toggle">{{ playing ? '⏸' : '▶' }}</button>
    <input
      type="range"
      :min="startMs"
      :max="endMs"
      :step="step"
      :value="store.currentTimeMs"
      @input="onScrub"
    />
    <span class="t">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useTrajectoryStore } from '@/stores/trajectory'

const store = useTrajectoryStore()
const playing = ref(false)
let raf = 0
let last = 0

const hasData = computed(() => Object.keys(store.trajectories).length > 0)
const startMs = computed(() => Date.parse(store.startTimeISO))
const endMs = computed(() => Date.parse(store.endTimeISO))
const step = computed(() => store.intervalMinutes * 60 * 1000)

const label = computed(() => new Date(store.currentTimeMs).toISOString().slice(0, 16) + 'Z')

function onScrub(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  store.currentTimeMs = v
}

function tick(ts: number) {
  if (!last) last = ts
  const dt = ts - last
  last = ts
  store.currentTimeMs += dt * 60
  if (store.currentTimeMs >= endMs.value) {
    store.currentTimeMs = endMs.value
    playing.value = false
    return
  }
  raf = requestAnimationFrame(tick)
}

function toggle() {
  if (playing.value) {
    playing.value = false
    cancelAnimationFrame(raf)
    last = 0
  } else {
    if (store.currentTimeMs >= endMs.value) store.currentTimeMs = startMs.value
    playing.value = true
    raf = requestAnimationFrame(tick)
  }
}

onUnmounted(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.anim {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  color: #222;
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.anim button {
  font-size: 16px;
  padding: 2px 10px;
  cursor: pointer;
}
.anim input[type='range'] {
  flex: 1;
}
.t {
  font-family: monospace;
  font-size: 12px;
  white-space: nowrap;
}
</style>
