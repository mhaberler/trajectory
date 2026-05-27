import type { Trajectory, TrajectoryPoint } from '@/types/trajectory'
import { garminColorFromHue, levelColorHex, levelHue } from '@/utils/models'

export type ExportFormat = 'gpx' | 'kml' | 'geojson'

export interface ExportMeta {
  startISO: string
  modelId: string
  minHpa: number
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function pointExtensions(p: TrajectoryPoint): string {
  return `speed_ms="${p.speed.toFixed(3)}" speed_kmh="${(p.speed * 3.6).toFixed(2)}" dir_deg="${p.dir.toFixed(1)}" pressure_hpa="${p.level}"`
}

function hexToKmlColor(hex: string): string {
  // #RRGGBB → AABBGGRR (KML byte order, alpha=ff)
  const r = hex.slice(1, 3)
  const g = hex.slice(3, 5)
  const b = hex.slice(5, 7)
  return `ff${b}${g}${r}`.toLowerCase()
}

export function toGPX(
  trajectories: Record<number, Trajectory>,
  meta: ExportMeta,
): string {
  const tracks: string[] = []
  for (const [levelStr, traj] of Object.entries(trajectories)) {
    const level = Number(levelStr)
    const garmin = garminColorFromHue(levelHue(level, meta.minHpa))
    const pts = traj
      .map(
        (p) =>
          `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">\n` +
          `        <ele>${p.altitudeM.toFixed(1)}</ele>\n` +
          `        <time>${p.t}</time>\n` +
          `        <extensions><wind ${pointExtensions(p)}/></extensions>\n` +
          `      </trkpt>`,
      )
      .join('\n')
    tracks.push(
      `  <trk>\n` +
        `    <name>${escapeXml(levelStr)} hPa</name>\n` +
        `    <desc>model=${escapeXml(meta.modelId)} start=${escapeXml(meta.startISO)}</desc>\n` +
        `    <extensions>\n` +
        `      <gpxx:TrackExtension>\n` +
        `        <gpxx:DisplayColor>${garmin}</gpxx:DisplayColor>\n` +
        `      </gpxx:TrackExtension>\n` +
        `    </extensions>\n` +
        `    <trkseg>\n${pts}\n    </trkseg>\n` +
        `  </trk>`,
    )
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="vue3-leaflet wind-trajectory"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">
${tracks.join('\n')}
</gpx>
`
}

export function toKML(
  trajectories: Record<number, Trajectory>,
  meta: ExportMeta,
): string {
  const levels = Object.keys(trajectories).map(Number)
  const styles = levels
    .map((L) => {
      const c = hexToKmlColor(levelColorHex(L, meta.minHpa))
      return `  <Style id="lvl-${L}">
    <LineStyle><color>${c}</color><width>3</width></LineStyle>
  </Style>`
    })
    .join('\n')

  const placemarks: string[] = []
  for (const [levelStr, traj] of Object.entries(trajectories)) {
    const coords = traj
      .map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)},${p.altitudeM.toFixed(1)}`)
      .join(' ')
    const line = `    <Placemark>
      <name>${escapeXml(levelStr)} hPa track</name>
      <styleUrl>#lvl-${levelStr}</styleUrl>
      <description>model=${escapeXml(meta.modelId)} start=${escapeXml(meta.startISO)}</description>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>`
    const points = traj
      .map(
        (p) => `    <Placemark>
      <name>${escapeXml(levelStr)} hPa @ ${p.t}</name>
      <description><![CDATA[time=${p.t}; alt=${Math.round(p.altitudeM)} m; speed=${(p.speed * 3.6).toFixed(1)} km/h; dir=${Math.round(p.dir)}°]]></description>
      <ExtendedData>
        <Data name="time"><value>${p.t}</value></Data>
        <Data name="altitude_m"><value>${p.altitudeM.toFixed(1)}</value></Data>
        <Data name="speed_ms"><value>${p.speed.toFixed(3)}</value></Data>
        <Data name="speed_kmh"><value>${(p.speed * 3.6).toFixed(2)}</value></Data>
        <Data name="direction_deg"><value>${p.dir.toFixed(1)}</value></Data>
        <Data name="pressure_hpa"><value>${p.level}</value></Data>
      </ExtendedData>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${p.lon.toFixed(6)},${p.lat.toFixed(6)},${p.altitudeM.toFixed(1)}</coordinates>
      </Point>
    </Placemark>`,
      )
      .join('\n')
    placemarks.push(`  <Folder>\n    <name>${escapeXml(levelStr)} hPa</name>\n${line}\n${points}\n  </Folder>`)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Wind trajectories</name>
  <description>model=${escapeXml(meta.modelId)} start=${escapeXml(meta.startISO)}</description>
${styles}
${placemarks.join('\n')}
</Document>
</kml>
`
}

export function toGeoJSON(
  trajectories: Record<number, Trajectory>,
  meta: ExportMeta,
): string {
  const features: unknown[] = []
  for (const [levelStr, traj] of Object.entries(trajectories)) {
    const level = Number(levelStr)
    const stroke = levelColorHex(level, meta.minHpa)
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: traj.map((p) => [p.lon, p.lat, p.altitudeM]),
      },
      properties: {
        kind: 'trajectory',
        pressure_hpa: level,
        model: meta.modelId,
        start: meta.startISO,
        stroke,
        'stroke-width': 3,
        'stroke-opacity': 0.8,
      },
    })
    for (const p of traj) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat, p.altitudeM] },
        properties: {
          kind: 'sample',
          pressure_hpa: p.level,
          time: p.t,
          altitude_m: p.altitudeM,
          speed_ms: p.speed,
          speed_kmh: p.speed * 3.6,
          direction_deg: p.dir,
        },
      })
    }
  }
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2)
}

export function downloadText(filename: string, mime: string, body: string): void {
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function exportTrajectories(
  format: ExportFormat,
  trajectories: Record<number, Trajectory>,
  meta: ExportMeta,
): void {
  const stamp = meta.startISO.replace(/[:.]/g, '-').slice(0, 16)
  const base = `wind-traj-${meta.modelId}-${stamp}`
  if (format === 'gpx') {
    downloadText(`${base}.gpx`, 'application/gpx+xml', toGPX(trajectories, meta))
  } else if (format === 'kml') {
    downloadText(`${base}.kml`, 'application/vnd.google-earth.kml+xml', toKML(trajectories, meta))
  } else {
    downloadText(`${base}.geojson`, 'application/geo+json', toGeoJSON(trajectories, meta))
  }
}
