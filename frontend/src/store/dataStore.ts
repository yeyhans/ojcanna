// frontend/src/store/dataStore.ts
//
// Singleton de caché con dos capas:
//   1. Memoria (_memCache)   — instantáneo, vive mientras la tab está abierta
//   2. sessionStorage        — sobrevive refresh de página, se limpia al cerrar la tab
//
// Deduplicación de in-flight: si dos partes de la app piden la misma URL
// al mismo tiempo, solo se hace UNA request de red.

import type { CeadFeatureCollection } from '../types/cead'

const SESSION_PREFIX = 'obs_cead_'

// ── Caché en memoria ────────────────────────────────────────────────────────
const _memCache = new Map<string, CeadFeatureCollection>()

// ── In-flight promises (evita requests duplicadas para la misma key) ─────────
const _inflight = new Map<string, Promise<CeadFeatureCollection | null>>()

// ── Helpers de clave ─────────────────────────────────────────────────────────
export function buildCacheKey(anio: number, subgrupos: string[]): string {
  // Ordenar para que [a,b] y [b,a] produzcan la misma clave
  return `${anio}_${[...subgrupos].sort().join(',')}`
}

export function buildApiUrl(anio: number, subgrupos: string[]): string {
  const params = new URLSearchParams({
    anio: String(anio),
    subgrupos: subgrupos.join(','),
  })
  return `/api/v1/mapa/cead?${params}`
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
      if (k?.startsWith(SESSION_PREFIX)) return true
    }
    return false
  } catch {
    return false
  }
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
   * Pre-fetch + caché. Retorna una Promise que:
   *   - Resuelve instantáneamente si ya hay datos en memoria/sessionStorage.
   *   - Comparte la Promise en vuelo si ya hay una request en curso (dedup).
   *   - Guarda automáticamente en caché cuando la red responde.
   */
  prefetch(anio: number, subgrupos: string[]): Promise<CeadFeatureCollection | null> {
    // 1. Caché hit
    const cached = this.get(anio, subgrupos)
    if (cached) return Promise.resolve(cached)

    const key = buildCacheKey(anio, subgrupos)

    // 2. Request en vuelo existente (dedup)
    const existing = _inflight.get(key)
    if (existing) return existing

    // 3. Nueva request
    const url = buildApiUrl(anio, subgrupos)
    const promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<CeadFeatureCollection>
      })
      .then((data) => {
        this.set(anio, subgrupos, data)
        return data
      })
      .catch(() => null)
      .finally(() => _inflight.delete(key))

    _inflight.set(key, promise)
    return promise
  },
}
