// frontend/src/store/geomStore.ts
//
// Singleton de geometrías de comunas. Las 344 comunas son ESTÁTICAS:
//   - Cambian sólo cuando se actualiza la tabla `comunas` en Postgres y se
//     redespliega el backend (operación manual, infrecuente).
//   - Por eso el endpoint /api/v1/cead/geometrias responde con
//     `Cache-Control: public, max-age=31536000, immutable` y este store
//     mantiene una promesa única por sesión + persistencia en sessionStorage.
//
// Las hojas de estadísticas (CEAD/DPP/PDI) se piden por separado y se mergean
// client-side: cada feature de geometría se clona e inyectan las properties
// específicas del dataset.

const SESSION_KEY = 'obs_geom_v1'

export interface GeomFeature {
  type: 'Feature'
  geometry: GeoJSON.Geometry
  properties: { cut: string }
}

interface GeomFeatureCollection {
  type: 'FeatureCollection'
  features: GeomFeature[]
}

let _memMap: Map<string, GeomFeature> | null = null
let _inflight: Promise<Map<string, GeomFeature>> | null = null

function buildMap(fc: GeomFeatureCollection): Map<string, GeomFeature> {
  const map = new Map<string, GeomFeature>()
  for (const feat of fc.features) {
    if (feat?.properties?.cut) {
      map.set(feat.properties.cut, feat)
    }
  }
  return map
}

function loadFromSession(): GeomFeatureCollection | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GeomFeatureCollection
  } catch {
    return null
  }
}

function saveToSession(fc: GeomFeatureCollection): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(fc))
  } catch {
    // QuotaExceededError: ignorar — la memoria sigue funcionando para la sesión
  }
}

/**
 * Devuelve un Map<cut, GeomFeature> para hacer lookups O(1).
 * Garantiza una única descarga de red durante toda la sesión:
 *  - Memoria → instantáneo
 *  - sessionStorage → ~10–30ms (parse JSON)
 *  - Red → primera vez (Cloudflare/Vercel CDN cachea inmutable forever)
 */
export function fetchComunasGeom(): Promise<Map<string, GeomFeature>> {
  if (_memMap) return Promise.resolve(_memMap)

  if (_inflight) return _inflight

  // Hidratar desde sessionStorage si existe
  const cached = loadFromSession()
  if (cached) {
    _memMap = buildMap(cached)
    return Promise.resolve(_memMap)
  }

  _inflight = fetch('/api/v1/cead/geometrias')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<GeomFeatureCollection>
    })
    .then((fc) => {
      saveToSession(fc)
      _memMap = buildMap(fc)
      return _memMap
    })
    .finally(() => {
      _inflight = null
    })

  return _inflight
}

/**
 * Lectura sincrónica del Map. Devuelve null si todavía no se ha hidratado.
 * Útil para evitar promesas en hooks cuando el AppDataProvider ya pre-fetchó.
 */
export function getComunasGeomSync(): Map<string, GeomFeature> | null {
  return _memMap
}

/**
 * Mergea geometrías + properties arbitrarias en un FeatureCollection listo
 * para MapLibre. `statsByCut` es cualquier objeto cuyo lookup por `cut`
 * devuelva las properties que el mapa va a pintar.
 */
export function mergeGeomWithStats<TProps extends { cut: string }>(
  geomMap: Map<string, GeomFeature>,
  statsByCut: Map<string, TProps>,
  fallbackProps: (cut: string) => TProps
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const [cut, geomFeat] of geomMap) {
    const props = statsByCut.get(cut) ?? fallbackProps(cut)
    features.push({
      type: 'Feature',
      geometry: geomFeat.geometry,
      properties: props,
    })
  }
  return { type: 'FeatureCollection', features }
}
