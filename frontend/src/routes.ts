// frontend/src/routes.ts
//
// Registro central de rutas del observatorio.
//
// Fuente única de verdad para tres consumidores que antes estaban desincronizados:
//   - App.tsx    → tema por ruta (antes: `pathname === '/'` hardcodeado)
//   - NavBar.tsx → links agrupados por capa
//   - AppDataProvider → decidir qué prefetchear
//
// Agregar una ruta nueva = agregar una entrada acá + su <Route> en App.tsx.

/** Capa de la arquitectura de información. Define el agrupamiento del NavBar. */
export type RouteGroup = 'evidencia' | 'marco-legal' | 'analisis'

export interface RouteMeta {
  path: string
  /** Etiqueta corta del NavBar. */
  label: string
  /** Tooltip — describe qué responde la página. */
  title: string
  group: RouteGroup
  /** Tema forzado. El mapa usa el basemap claro de Carto; el resto es dark. */
  theme: 'light' | 'dark'
  /** false = existe el código pero no se lista ni se rutea (pendiente de datos). */
  visible: boolean
}

export const GROUP_LABEL: Record<RouteGroup, string> = {
  evidencia: 'Evidencia',
  'marco-legal': 'Marco legal',
  analisis: 'Análisis',
}

/** Orden de los grupos en el NavBar. */
export const GROUP_ORDER: RouteGroup[] = ['evidencia', 'marco-legal', 'analisis']

export const ROUTES: RouteMeta[] = [
  {
    path: '/mapa',
    label: 'Mapa',
    title: 'Detenciones policiales por comuna — CEAD',
    group: 'evidencia',
    theme: 'light',
    visible: true,
  },
  {
    path: '/dpp',
    label: 'Defensoría',
    title: 'Causas Ley 20.000 — Defensoría Penal Pública',
    group: 'evidencia',
    theme: 'dark',
    visible: true,
  },
  {
    path: '/fiscalia',
    label: 'Fiscalía',
    title: 'Causas Ley 20.000 — Ministerio Público',
    group: 'evidencia',
    theme: 'dark',
    visible: true,
  },
  {
    path: '/pdi',
    label: 'PDI',
    title: 'Investigaciones policiales por región — PDI',
    group: 'evidencia',
    theme: 'dark',
    visible: true,
  },
  {
    path: '/datos',
    label: 'Descargas',
    title: 'Bases de datos crudas en CSV y XLSX',
    group: 'evidencia',
    theme: 'dark',
    visible: true,
  },
  {
    path: '/bibliografia',
    label: 'Bibliografía',
    title: 'Corpus normativo que respalda el observatorio',
    group: 'marco-legal',
    theme: 'dark',
    visible: true,
  },
  {
    path: '/metodologia',
    label: 'Metodología',
    title: 'Cómo se construye cada cifra publicada',
    group: 'analisis',
    theme: 'dark',
    visible: true,
  },
  // HIDDEN — pendiente dataset real de PJud (SAIP en gestión).
  // Restaurar poniendo visible:true y destapando el <Route> en App.tsx.
  {
    path: '/pjud',
    label: 'Poder Judicial',
    title: 'Sentencias Ley 20.000 — discrecionalidad judicial',
    group: 'evidencia',
    theme: 'dark',
    visible: false,
  },
  {
    path: '/embudo',
    label: 'Embudo',
    title: 'Embudo del Punitivismo — flujo CEAD → PDI → Fiscalía → DPP → PJud',
    group: 'analisis',
    theme: 'dark',
    visible: false,
  },
]

/** Rutas listables en el NavBar, agrupadas y en el orden declarado. */
export function visibleRoutesByGroup(): { group: RouteGroup; routes: RouteMeta[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    routes: ROUTES.filter((r) => r.visible && r.group === group),
  })).filter((g) => g.routes.length > 0)
}

/**
 * Tema del `<html data-theme>` para un pathname.
 * La portada ("/") y cualquier ruta desconocida usan dark.
 */
export function themeForPath(pathname: string): 'light' | 'dark' {
  return ROUTES.find((r) => r.path === pathname)?.theme ?? 'dark'
}
