// frontend/src/store/urlCache.ts
//
// Cache genérica por URL con dos capas:
//   1. Memoria (_mem)     — lectura <1ms, vive mientras la tab está abierta
//   2. sessionStorage     — sobrevive refresh de página, se limpia al cerrar tab
//
// Deduplicación in-flight: si dos hooks piden la misma URL al mismo tiempo,
// solo se hace UNA request de red y ambos obtienen el mismo resultado.

const SESSION_PREFIX = 'obs_url_'

const _mem = new Map<string, unknown>()
const _inflight = new Map<string, Promise<unknown>>()

// ── sessionStorage helpers ────────────────────────────────────────────────────

function sessionGet<T>(url: string): T | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + url)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function sessionSet(url: string, data: unknown): void {
  try {
    sessionStorage.setItem(SESSION_PREFIX + url, JSON.stringify(data))
  } catch {
    // QuotaExceededError — sessionStorage lleno; la memoria sigue funcionando
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

export const urlCache = {
  /**
   * Lectura sincrónica.
   * Orden: memoria → sessionStorage (rehidrata memoria automáticamente).
   */
  get<T>(url: string): T | null {
    const mem = _mem.get(url)
    if (mem !== undefined) return mem as T

    const session = sessionGet<T>(url)
    if (session !== null) {
      _mem.set(url, session)
      return session
    }
    return null
  },

  /**
   * Escritura en ambas capas.
   */
  set<T>(url: string, data: T): void {
    _mem.set(url, data)
    sessionSet(url, data)
  },

  /**
   * Fetch con cache completa:
   *   - Cache hit  → Promise.resolve(data) instantánea
   *   - In-flight  → comparte la Promise existente (dedup)
   *   - Cache miss → hace fetch, guarda en cache, retorna datos
   *
   * Errores de red: retorna null y no contamina el cache.
   */
  fetch<T>(url: string): Promise<T | null> {
    // 1. Cache hit
    const cached = this.get<T>(url)
    if (cached !== null) return Promise.resolve(cached)

    // 2. In-flight dedup
    const existing = _inflight.get(url)
    if (existing) return existing as Promise<T | null>

    // 3. Nueva request
    const promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<T>
      })
      .then((data) => {
        this.set(url, data)
        return data as T | null
      })
      .catch(() => null as T | null)
      .finally(() => _inflight.delete(url))

    _inflight.set(url, promise)
    return promise
  },
}
