// frontend/src/store/dataStore.ts
//
// Cache de FeatureCollections CEAD listos para MapLibre.
//
// El cambio importante respecto a la versión anterior:
//   - Antes: una sola request a /api/v1/mapa/cead que devolvía geom + stats juntos
//     (~500KB–1MB por combinación de filtros).
//   - Ahora: dos requests paralelas (geometrías estáticas vía geomStore +
//     /api/v1/cead/stats ligero ~10KB) que se mergean en el cliente.
//
// API pública (`get`/`set`/`prefetch`) sin cambios → useCeadMapa.ts no necesita
// modificarse. La memoria cachea el feature collection ya merged para que
// los re-renders sean instantáneos.

import type { CeadFeatureCollection, CeadFeatureProperties } from '../types/cead'
import { fetchComunasGeom, mergeGeomWithStats } from './geomStore'

const SESSION_PREFIX = 'obs_cead_'

// ── Caché en memoria del FeatureCollection merged ───────────────────────────
const _memCache = new Map<string, CeadFeatureCollection>()

// ── In-flight promises (dedup de requests por la misma combinación) ──────────
const _inflight = new Map<string, Promise<CeadFeatureCollection | null>>()

// ── Stats response shape (ver backend/api/schemas/cead.py:StatsResponse) ─────
interface StatsItemDTO {
  cut: string
  nombre: string
  tasa_agregada: number
  frecuencia_total: number
}
interface StatsResponseDTO {
  anio: number
  subgrupos: string[]
  stats: StatsItemDTO[]
}

// ── Helpers de clave ─────────────────────────────────────────────────────────
export function buildCacheKey(anio: number, subgrupos: string[]): string {
  // Ordenar para que [a,b] y [b,a] produzcan la misma clave
  return `${anio}_${[...subgrupos].sort().join(',')}`
}

export function buildStatsUrl(anio: number, subgrupos: string[]): string {
  const params = new URLSearchParams({
    anio: String(anio),
    subgrupos: subgrupos.join(','),
  })
  return `/api/v1/cead/stats?${params}`
}

// ── sessionStorage helpers ────────────────────────────────────────────────────
function sessionGet(key: string): CeadFeatureCollection | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as CeadFeatureCollection
  } catch {
    return null
  }
}

function sessionSet(key: string, data: CeadFeatureCollection): void {
  try {
    sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(data))
  } catch {
    // QuotaExceededError: sessionStorage lleno — ignorar silenciosamente
  }
}

export function hasAnySessionData(): boolean {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      // El splash se salta si HAY geometrías cacheadas (segunda visita)
      if (k === 'obs_geom_v1') return true
      if (k?.startsWith(SESSION_PREFIX)) return true
    }
    return false
  } catch {
    return false
  }
}

// ── Merge helpers ─────────────────────────────────────────────────────────────
function buildStatsByCut(stats: StatsItemDTO[]): Map<string, CeadFeatureProperties> {
  const map = new Map<string, CeadFeatureProperties>()
  for (const s of stats) {
    map.set(s.cut, {
      cut: s.cut,
      nombre: s.nombre,
      tasa_agregada: s.tasa_agregada,
      frecuencia_total: s.frecuencia_total,
    })
  }
  return map
}

// ── API pública ────────────────────────────────────────────────────────────────
export const dataStore = {
  /**
   * Lectura sincrónica.
   * Orden: memoria → sessionStorage (rehidrata a memoria automáticamente).
   */
  get(anio: number, subgrupos: string[]): CeadFeatureCollection | null {
    const key = buildCacheKey(anio, subgrupos)
    const mem = _memCache.get(key)
    if (mem) return mem

    const session = sessionGet(key)
    if (session) {
      _memCache.set(key, session) // rehidratar para lecturas futuras
      return session
    }
    return null
  },

  /**
   * Escritura en ambas capas.
   */
  set(anio: number, subgrupos: string[], data: CeadFeatureCollection): void {
    const key = buildCacheKey(anio, subgrupos)
    _memCache.set(key, data)
    sessionSet(key, data)
  },

  /**
   * Pre-fetch + merge + caché. Resuelve instantáneamente si ya está cacheado.
   * Hace `Promise.all([geom, stats])` en paralelo cuando hay miss.
   */
  prefetch(anio: number, subgrupos: string[]): Promise<CeadFeatureCollection | null> {
    // 1. Caché hit
    const cached = this.get(anio, subgrupos)
    if (cached) return Promise.resolve(cached)

    const key = buildCacheKey(anio, subgrupos)

    // 2. Request en vuelo existente (dedup)
    const existing = _inflight.get(key)
    if (existing) return existing

    // 3. Nueva request: geom + stats en paralelo
    const url = buildStatsUrl(anio, subgrupos)
    const promise = Promise.all([
      fetchComunasGeom(),
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<StatsResponseDTO>
      }),
    ])
      .then(([geomMap, statsResp]) => {
        const statsByCut = buildStatsByCut(statsResp.stats)
        const fc = mergeGeomWithStats<CeadFeatureProperties>(
          geomMap,
          statsByCut,
          (cut) => ({
            cut,
            nombre: '',
            tasa_agregada: 0,
            frecuencia_total: 0,
          }),
        ) as CeadFeatureCollection
        this.set(anio, subgrupos, fc)
        return fc
      })
      .catch(() => null)
      .finally(() => _inflight.delete(key))

    _inflight.set(key, promise)
    return promise
  },
}
