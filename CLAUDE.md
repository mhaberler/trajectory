# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Runtime: `bun` is used locally (lockfile is `bun.lock`), but scripts also work with `npm`.

- `bun run dev` — Vite dev server (port 5173, falls back to 5174 if busy).
- `bun run build` — Parallel type-check (`vue-tsc --build`) + Vite production build. Type errors fail the build.
- `bun run type-check` — Type-check only, no bundling.
- `bun run lint` — Runs oxlint then eslint, both with `--fix`.
- `bun run format` — Prettier on `src/`.
- `bun run preview` — Preview the built `dist/`.

There is no test suite.

## Architecture

This is a single-page Vue 3 + Vite + TypeScript app that visualizes hypothetical wind-driven balloon trajectories on a Leaflet map using Open-Meteo upper-air forecast data.

### Data flow (one feature, one direction)

`TrajectoryPanel.vue` (form) → `useTrajectoryStore` (Pinia) → `fetchWindProfile` (Open-Meteo HTTP) → `computeTrajectory` (per-level RK2 dead-reckoning) → `store.trajectories` → `TrajectoryLayer.vue` (polylines + animated markers) + `AnimationControl.vue` (time scrubber driving `store.currentTimeMs`).

The store owns all settings and computed trajectories; components are read/write views onto the store. There is one route (`/`) and one feature; `HomeView`/`AboutView`/`counter` store are scaffold leftovers, not in use.

### Key invariants

- **Wind interpolation uses (u,v) components**, never angles directly. Direction wraps at 0°/360° — interpolating angles linearly produces wrong vectors. See `interpolateWind` in `src/utils/geo.ts`.
- **Integration is RK2 (midpoint)** at `intervalMinutes` step. Sample wind at half-step, advance with that velocity. See `computeTrajectory` in `src/composables/useTrajectory.ts`.
- **Spatial fetch strategy** is "snap-with-drift-refetch": one Open-Meteo column per `(lat,lon)`, plus a new column whenever the parcel drifts > 25 km from the nearest existing sample. The sampler closure in `stores/trajectory.ts::compute()` enforces this.
- **Open-Meteo requests must set `cell_selection=nearest`** and `wind_speed_unit=ms`. Skipping `nearest` triggers elevation-based snapping which is wrong for upper-air trajectories.
- **Pressure levels are model-specific**. `src/utils/models.ts` lists the supported levels per model (GFS 44, ICON 19, ICON-D2 14, ECMWF 13). Switching models in the panel auto-prunes selected levels that the new model doesn't support.
- **Regional models carry an axis-aligned `bbox`** used both for the "applicable models" filter and for drawing the coverage rectangle on the map. Global models have `bbox: null`.

### Conventions specific to this repo

- Path alias `@/*` → `src/*`. Always import via the alias, never relative `../../`.
- `tsconfig.app.json` has `noUncheckedIndexedAccess: true`. Bracket access into arrays/records is `T | undefined`. Use a helper or explicit guards rather than non-null assertions.
- The Vue scaffold's `base.css` honors `prefers-color-scheme: dark` and sets light text colors on `body`. Any panel/overlay with a forced light background must scope its own `color` rule, or labels become invisible on dark-mode macOS.
- Settings persist to `localStorage` under `trajectory.settings.v1` (location, durationHours, intervalMinutes, levels, modelId, minPressureHpa). Start time is not persisted — it always defaults to the current hour.
- `src/vue-shim.d.ts` provides the `*.vue` module declaration; do not remove.

### Open-Meteo specifics worth remembering

- Endpoint: `https://api.open-meteo.com/v1/forecast`. Geocoding: `https://geocoding-api.open-meteo.com/v1/search`.
- Upper-air variables per level: `wind_speed_<L>hPa`, `wind_direction_<L>hPa`, `geopotential_height_<L>hPa`. There is no `minutely_15` for pressure levels — hourly is the finest temporal resolution; sub-hourly steps interpolate client-side.
- `ecmwf_forecast` accepts only `ecmwf_ifs`, `ecmwf_ifs025`, or `best_match`. Other ECMWF model keys return HTTP 400.
- There is no public endpoint that lists "models applicable at lat/lon" — coverage filtering is hard-coded client-side via the bbox metadata in `src/utils/models.ts`.
