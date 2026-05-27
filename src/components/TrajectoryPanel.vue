<template>
  <aside class="panel">
    <h2>Wind Trajectory</h2>

    <section>
      <label>Search location</label>
      <div class="row">
        <input
          v-model="searchQuery"
          placeholder="e.g. Vienna"
          @keydown.enter="runSearch"
        />
        <button :disabled="searching" @click="runSearch">Go</button>
      </div>
      <ul v-if="hits.length" class="hits">
        <li v-for="h in hits" :key="`${h.latitude},${h.longitude}`" @click="pick(h)">
          {{ h.name }}<span v-if="h.admin1">, {{ h.admin1 }}</span>
          <span v-if="h.country"> ({{ h.country }})</span>
        </li>
      </ul>
      <div v-if="store.location" class="muted">
        At {{ store.location.lat.toFixed(4) }}, {{ store.location.lon.toFixed(4) }}
      </div>
    </section>

    <section>
      <label>Model</label>
      <select v-model="store.modelId">
        <option v-for="m in available" :key="m.id" :value="m.id">{{ m.label }}</option>
      </select>
    </section>

    <section>
      <label>Start time (local)</label>
      <input v-model="store.startTime" type="datetime-local" />
    </section>

    <section>
      <label>Duration: {{ store.durationHours }} h</label>
      <input
        v-model.number="store.durationHours"
        type="range"
        min="1"
        max="6"
        step="1"
      />
    </section>

    <section>
      <label>Interval: {{ store.intervalMinutes }} min</label>
      <input
        v-model.number="store.intervalMinutes"
        type="range"
        min="5"
        max="60"
        step="5"
      />
    </section>

    <section>
      <label>Min pressure (top altitude)</label>
      <select v-model.number="store.minPressureHpa">
        <option v-for="L in modelLevels" :key="L" :value="L">
          {{ L }} hPa (~{{ altLabel(L) }})
        </option>
      </select>
    </section>

    <section>
      <label>Pressure levels (hPa / approx altitude)</label>
      <div class="levels">
        <label v-for="L in visibleLevels" :key="L" class="level-chip">
          <input
            type="checkbox"
            :checked="store.levels.includes(L)"
            @change="store.toggleLevel(L)"
          />
          <span class="hpa" :style="{ color: levelColor(L, store.minPressureHpa) }">{{ L }}</span>
          <span class="alt">{{ altLabel(L) }}</span>
        </label>
      </div>
    </section>

    <button class="compute" :disabled="store.computing" @click="store.compute">
      {{ store.computing ? 'Computing…' : 'Compute trajectories' }}
    </button>

    <div v-if="store.error" class="error">{{ store.error }}</div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTrajectoryStore } from '@/stores/trajectory'
import { applicableModels, levelColor, modelById } from '@/utils/models'
import { geocode, type GeocodeHit } from '@/composables/useOpenMeteo'
import { isaAltitudeM } from '@/utils/geo'

const store = useTrajectoryStore()
const searchQuery = ref('')
const hits = ref<GeocodeHit[]>([])
const searching = ref(false)

const modelLevels = computed(() => modelById(store.modelId)?.levels ?? [])

const visibleLevels = computed(() =>
  modelLevels.value.filter((L) => L >= store.minPressureHpa),
)

const available = computed(() =>
  store.location ? applicableModels(store.location) : [],
)

function altLabel(hpa: number): string {
  const m = isaAltitudeM(hpa)
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${Math.round(m)} m`
}

watch(
  () => store.modelId,
  () => {
    const supported = new Set(modelLevels.value)
    const filtered = store.levels.filter((L) => supported.has(L))
    if (filtered.length !== store.levels.length) store.levels = filtered
    if (!supported.has(store.minPressureHpa)) {
      const candidate = modelLevels.value.find((L) => L <= store.minPressureHpa)
      store.minPressureHpa = candidate ?? modelLevels.value[modelLevels.value.length - 1] ?? 500
    }
  },
)

watch(
  () => store.minPressureHpa,
  () => {
    store.levels = store.levels.filter((L) => L >= store.minPressureHpa)
  },
)

async function runSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  try {
    hits.value = await geocode(searchQuery.value)
  } finally {
    searching.value = false
  }
}

function pick(h: GeocodeHit) {
  store.setLocation(h.latitude, h.longitude)
  hits.value = []
  searchQuery.value = h.name
}
</script>

<style scoped>
.panel {
  width: 320px;
  height: 100vh;
  overflow-y: auto;
  padding: 12px 14px;
  background: #f7f7f7;
  color: #222;
  border-right: 1px solid #ddd;
  font-size: 14px;
  box-sizing: border-box;
}
.panel h2,
.panel label,
.panel .muted {
  color: #222;
}
.panel .muted {
  color: #666;
}
h2 {
  margin: 0 0 12px;
  font-size: 16px;
}
section {
  margin-bottom: 12px;
}
label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}
input[type='text'],
input:not([type]),
input[type='datetime-local'],
select {
  width: 100%;
  padding: 4px 6px;
  box-sizing: border-box;
}
input[type='range'] {
  width: 100%;
}
.row {
  display: flex;
  gap: 6px;
}
.row input {
  flex: 1;
}
.hits {
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
  max-height: 140px;
  overflow-y: auto;
  border: 1px solid #ccc;
  background: white;
}
.hits li {
  padding: 4px 6px;
  cursor: pointer;
}
.hits li:hover {
  background: #eef;
}
.muted {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}
.levels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #ddd;
  background: white;
  padding: 4px 6px;
}
.level-chip {
  display: grid;
  grid-template-columns: 16px 50px 1fr;
  align-items: center;
  gap: 6px;
  font-weight: normal;
  font-size: 12px;
}
.level-chip .hpa {
  font-family: monospace;
  font-weight: 600;
  text-align: right;
}
.level-chip .alt {
  color: #666;
  font-size: 11px;
}
.compute {
  width: 100%;
  padding: 8px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.compute:disabled {
  background: #999;
}
.error {
  color: #b00;
  margin-top: 8px;
  font-size: 12px;
}
</style>
