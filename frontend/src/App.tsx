// frontend/src/App.tsx
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { SplashScreen } from './components/SplashScreen'
import { AppDataProvider } from './providers/AppDataProvider'
import { useAppData } from './providers/appDataContext'
import { themeForPath } from './routes'
import HomePage from './pages/HomePage'

// MapaPage es lazy: arrastra MapLibre GL (~200 KB gzip) y ya no es la landing.
// Quien nunca abre el mapa no paga ese bundle. Se prefetchea en idle desde
// AppDataProvider, así el primer click a /mapa encuentra el chunk listo.
const MapaPage = lazy(() => import('./pages/MapaPage'))

const DppPage = lazy(() => import('./pages/DppPage'))
const PdiPage = lazy(() => import('./pages/PdiPage'))
const FiscaliaPage = lazy(() => import('./pages/FiscaliaPage'))
const DatosPage = lazy(() => import('./pages/DatosPage'))
const BibliografiaPage = lazy(() => import('./pages/BibliografiaPage'))
const MetodologiaPage = lazy(() => import('./pages/MetodologiaPage'))
// HIDDEN — pendiente dataset real de PJud (ver routes.ts):
// const PjudPage = lazy(() => import('./pages/PjudPage'))
// const EmbudoPage = lazy(() => import('./pages/EmbudoPage'))

/** Altura del NavBar. Debe coincidir con el `h-16` de NavBar.tsx. */
const NAV_H = '4rem'
const CONTENT_TOP = `calc(${NAV_H} + env(safe-area-inset-top))`

function PageFallback() {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center">
      <div
        className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--rule-strong)', borderTopColor: 'var(--ink)' }}
      />
    </div>
  )
}

/**
 * Layout principal:
 *
 *   <NavBar fixed />
 *   <main>            ← scroll natural del documento (páginas-documento)
 *     <Routes />
 *   </main>
 *   <MapaSlot fixed /> ← fuera del flujo; montado sólo tras la primera visita
 *                        a /mapa y a partir de ahí nunca desmontado.
 *
 * El mapa vive en un slot `fixed` propio en vez de competir con el contenido
 * por un contenedor de altura fija. Eso libera a las páginas normales para
 * usar el scroll del documento — necesario para páginas largas como
 * /bibliografia o /metodologia, que antes quedaban en scroll anidado.
 *
 * Montaje perezoso: MapLibre calcula mal su tamaño si se monta oculto, así que
 * el slot se monta recién cuando el usuario entra a /mapa (con el contenedor
 * ya visible) y desde entonces sólo alterna visibility/pointerEvents/zIndex,
 * conservando instancia, tiles y style entre navegaciones.
 */
function AppShell() {
  const { showSplash, progress } = useAppData()
  const location = useLocation()
  const isMapaRoute = location.pathname === '/mapa'

  // Tema declarado por ruta (routes.ts). El script en index.html hace el primer
  // paint; este efecto sincroniza en cada navegación client-side.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeForPath(location.pathname))
  }, [location.pathname])

  // El mapa se monta la primera vez que se entra a /mapa y ya no se desmonta.
  // Se ajusta durante el render (no en un efecto) para que el mapa entre en el
  // mismo commit que la navegación a /mapa.
  const [mapaMounted, setMapaMounted] = useState(false)
  if (isMapaRoute && !mapaMounted) setMapaMounted(true)

  // Al navegar entre páginas-documento el scroll debe volver arriba.
  useEffect(() => {
    if (!isMapaRoute) window.scrollTo(0, 0)
  }, [location.pathname, isMapaRoute])

  return (
    <>
      {/* Splash: SOLO en el montaje inicial. Ya no hay splash por navegación —
          las páginas-documento no justifican 1500 ms de espera artificial. */}
      <SplashScreen visible={showSplash} progress={progress} />

      <NavBar />

      {/* Contenido — scroll del documento. Se oculta bajo el mapa cuando la
          ruta es /mapa (el slot del mapa es fixed y queda por encima). */}
      <main
        style={{
          paddingTop: CONTENT_TOP,
          minHeight: '100dvh',
          visibility: isMapaRoute ? 'hidden' : 'visible',
        }}
      >
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* /mapa no renderiza acá — vive en su slot fixed */}
            <Route path="/mapa" element={null} />
            <Route path="/dpp" element={<DppPage />} />
            <Route path="/pdi" element={<PdiPage />} />
            <Route path="/fiscalia" element={<FiscaliaPage />} />
            <Route path="/datos" element={<DatosPage />} />
            <Route path="/bibliografia" element={<BibliografiaPage />} />
            <Route path="/metodologia" element={<MetodologiaPage />} />
            {/* HIDDEN — pendiente dataset real de PJud:
            <Route path="/pjud" element={<PjudPage />} />
            <Route path="/embudo" element={<EmbudoPage />} /> */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Slot del mapa — fixed, montaje perezoso, nunca se desmonta. */}
      {mapaMounted && (
        <div
          aria-hidden={!isMapaRoute}
          style={{
            position: 'fixed',
            top: CONTENT_TOP,
            left: 0,
            right: 0,
            bottom: 0,
            visibility: isMapaRoute ? 'visible' : 'hidden',
            pointerEvents: isMapaRoute ? 'auto' : 'none',
            zIndex: isMapaRoute ? 30 : -1,
          }}
        >
          <Suspense fallback={<PageFallback />}>
            <MapaPage />
          </Suspense>
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppDataProvider>
  )
}
