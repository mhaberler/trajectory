# Balloon Trajectory

Single-page app that simulates wind-driven balloon trajectories on an interactive map, using upper-air forecast data from [Open-Meteo](https://open-meteo.com/).

## What it does

Pick a launch point (click map or search by name), choose pressure levels, a forecast model, start time, and duration — then hit **Compute**. The app fetches hourly wind forecasts at each selected pressure level, integrates a RK2 dead-reckoning trajectory for each level, and draws the paths on a Leaflet map with an animated time scrubber.

Trajectories can be exported as GPX, KML, or GeoJSON.

## Stack

- Vue 3 + Pinia + Vue Router
- Vite + TypeScript (`noUncheckedIndexedAccess`)
- Leaflet via `@vue-leaflet/vue-leaflet`
- Open-Meteo forecast & geocoding APIs (no key required)

## Dev

```
bun install
bun run dev        # http://localhost:5173
bun run build      # type-check + production bundle
bun run type-check # type-check only
bun run lint       # oxlint + eslint --fix
bun run format     # prettier
```

`npm` works in place of `bun` for all scripts.

## Supported models

| Model | Levels | Coverage |
|-------|--------|----------|
| GFS (NCEP) | 44 | Global |
| ICON (DWD) | 19 | Global |
| ICON-D2 (DWD) | 14 | Central Europe |
| IFS (ECMWF) | 13 | Global |

Regional models show a bounding-box overlay on the map; the panel auto-hides models that don't cover the selected launch point.

## Settings persistence

Launch location, model, levels, duration, interval, and min-pressure are saved to `localStorage` under `trajectory.settings.v1`. Start time always defaults to the current hour.
