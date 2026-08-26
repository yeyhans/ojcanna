# Reestructuración de transparencia.dispensai.cl

> Plan técnico de reestructuración del frontend. Decisión tomada: `/` pasa a ser
> portada narrativa, el mapa se mueve a `/mapa`.
> Complementa [`observatorio_roadmap.md`](./observatorio_roadmap.md), que define
> qué módulos de contenido construir. Este documento define el shell que los aloja.

---

## 1. Problemas del shell actual

Verificados en código, no supuestos:

| # | Problema | Evidencia |
|---|----------|-----------|
| 1 | El mapa es la home, sin contexto para el visitante nuevo | `App.tsx:105` — `MapaPage` montada en el slot de `/` |
| 2 | NavBar por institución, no por pregunta ciudadana | `NavBar.tsx:4-13` — "Defensoría / Fiscalía / PDI Analytics" |
| 3 | Shell de altura fija bloquea páginas-documento | `App.tsx:88` `height:100dvh` + dos slots `position:absolute` con `overflowY:auto` interno → scroll anidado |
| 4 | Splash de 1500 ms en **cada** navegación | `App.tsx:42` `ROUTE_SPLASH_MS` |
| 5 | El arranque bloquea en el GeoJSON de 344 comunas | `AppDataProvider.tsx:158-161` — `await` de geom+stats antes de ocultar el splash |
| 6 | Marca inconsistente con el dominio | `NavBar.tsx:39` "Anonimous Canna Observatorio" vs `transparencia.dispensai.cl` |
| 7 | Tema atado a `isMapaRoute` | `App.tsx:47,52-57` — `light` sólo si `pathname === '/'` |

**El problema 5 se vuelve grave con la portada nueva.** Hoy se justifica porque `/`
*es* el mapa. Cuando `/` sea una portada de texto, todo visitante nuevo esperará
por un GeoJSON que no va a ver. Es la mejora de rendimiento más grande que habilita
esta reestructuración.

---

## 2. Arquitectura objetivo

### Rutas

```
/                Portada narrativa — qué es, las 5 fuentes, los módulos
/mapa            Mapa CEAD comunal (persistente una vez montado)
/dpp             Defensoría Penal Pública
/pdi             PDI / datos.gob.cl
/fiscalia        Ministerio Público
/datos           Descargas CSV/XLSX + manifest
/bibliografia    17 PDFs normativos catalogados        ← nuevo
/metodologia     Cómo se construye cada cifra          ← nuevo
/normativa       Fichas de ley navegables              ← nuevo
/aprende         knowledge/ público                    ← nuevo
/legislativo     Boletines en tramitación              ← nuevo, requiere ETL
/embudo /pjud    Ocultas hasta dataset SAIP
```

`/` debe redirigir permanentemente al viejo comportamiento del mapa sólo si hay
enlaces externos publicados; en su defecto basta con `/mapa` limpio y un enlace
destacado desde la portada.

### Shell

Reemplazar el layout de dos slots absolutos por un shell de documento normal:

```
<NavBar fixed />
<main>                          ← scroll natural del documento, sin height fijo
  <Outlet />                    ← páginas normales
</main>
<MapaSlot />                    ← fixed inset-0, montado sólo tras primera
                                   visita a /mapa, luego nunca desmontado
```

**Regla clave del mapa persistente:** hoy `MapaPage` se monta siempre. Pasa a
montarse de forma perezosa (`hasVisitedMapa`) y a partir de ahí permanece montada,
alternando `visibility`/`pointerEvents`/`zIndex` como hoy. Preserva la
optimización de MapLibre (instancia, tiles, style entre navegaciones) sin
penalizar a quien nunca abre el mapa.

### Carga de datos

Invertir la prioridad del `AppDataProvider`:

| Hoy | Objetivo |
|-----|----------|
| Splash bloquea hasta geom+stats CEAD | Portada renderiza de inmediato |
| Analítica en background | Geom+stats CEAD en idle, o al navegar a `/mapa` |
| Splash en cada ruta (1500 ms) | Splash sólo en el arranque inicial |

`isAppReady` deja de significar "la app está lista" y pasa a significar
"el mapa CEAD puede pintar". Renombrar a `isMapaReady` para que el nombre no
mienta. La portada no depende de él.

El prefetch de chunks lazy (`prefetchLazyChunks`) se amplía con las páginas
nuevas, pero las estáticas (`/bibliografia`, `/metodologia`) son livianas y
pueden ir en el bundle principal si pesan poco.

### Navegación agrupada

Cinco items planos no escalan a doce rutas. Agrupar por capa, con las etiquetas
orientadas a la pregunta y la institución como subtítulo:

```
EVIDENCIA        Mapa · Defensoría · Fiscalía · PDI · Datos
MARCO LEGAL      Normativa · Bibliografía · Legislativo
ANÁLISIS         Metodología · Embudo (oculto)
APRENDE          Guías de acceso legal
```

Desktop: menú desplegable por grupo. Móvil: acordeón dentro del panel existente.

### Tema

Desacoplar de la ruta. `data-theme` pasa a ser: `light` en `/mapa` (el basemap
Carto es claro), `dark` en el resto — pero derivado de una propiedad declarada por
cada ruta, no de un `pathname === '/'` hardcodeado. Con doce rutas el condicional
actual se vuelve inmanejable.

---

## 3. Orden de ejecución

**Paso 1 — Shell.** Nuevo layout de documento, `MapaPage` a `/mapa` con montaje
perezoso, splash sólo inicial, tema declarado por ruta. Sin páginas nuevas todavía.
Es refactor puro: las 5 páginas existentes deben seguir funcionando idénticas.

**Paso 2 — Carga.** Invertir prioridades en `AppDataProvider`, renombrar
`isAppReady` → `isMapaReady`, mover geom+stats a idle/on-demand.

**Paso 3 — Portada.** `/` con propuesta de valor, las 5 fuentes con sus cifras
reales desde `/api/v1/export/manifest`, y las tarjetas de módulo. Cada cifra con
fuente y fecha de corte.

**Paso 4 — Navegación agrupada.** Recién cuando existan rutas suficientes para
justificar los grupos.

**Paso 5 — Contenido.** Las páginas nuevas según la prioridad del roadmap:
`/bibliografia` → `/metodologia` → `/normativa` → `/aprende` → `/legislativo`.

**Paso 6 — Marca.** Unificar el naming del NavBar con el dominio y el brand
DispensAI.

---

## 4. Riesgos

- **Regresión de MapLibre.** El montaje perezoso cambia el ciclo de vida del mapa.
  Verificar que el resize inicial ocurra con el contenedor ya visible; MapLibre
  calcula mal su tamaño si se monta oculto.
- **URLs publicadas.** Si `/` ya circula como enlace al mapa, la portada rompe esa
  expectativa. Confirmar antes de desplegar.
- **Cold start de Render.** La portada no debe depender de un endpoint lento; si
  `/api/v1/export/manifest` tarda, mostrar la portada con las cifras en carga
  progresiva, nunca bloquear el render.

---

*Documento de plan. El Paso 1 es refactor sin cambio funcional visible salvo la
nueva URL del mapa.*
