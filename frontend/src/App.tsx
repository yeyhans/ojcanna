// frontend/src/App.tsx
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { SplashScreen } from './components/SplashScreen'
import { AppDataProvider, useAppData } from './providers/AppDataProvider'
import MapaPage from './pages/MapaPage'

// Lazy: estos chunks se descargan en idle desde AppDataProvider después del
// primer render, así el primer click al NavBar encuentra el chunk listo.
const DppPage = lazy(() => import('./pages/DppPage'))
const PdiPage = lazy(() => import('./pages/PdiPage'))
const FiscaliaPage = lazy(() => import('./pages/FiscaliaPage'))
// HIDDEN — pendiente datos reales PJud:
// const PjudPage = lazy(() => import('./pages/PjudPage'))
// const EmbudoPage = lazy(() => import('./pages/EmbudoPage'))
const DatosPage = lazy(() => import('./pages/DatosPage'))

function PageFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--paper-deep)]">
      <div
        className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--rule-strong)', borderTopColor: 'var(--ink)' }}
      />
    </div>
  )
}

/**
 * Layout principal:
 *   <NavBar fixed />
 *   <main flex-1 relative>
 *     <MapaSlot absolute inset-0 />              ← MapaPage SIEMPRE montada
 *     <RoutesSlot absolute inset-0 />            ← rutas analíticas, lazy
 *   </main>
 *
 * MapaPage no se desmonta nunca — alterna su visibilidad con un wrapper
 * que cambia visibility/zIndex/pointerEvents según la ruta. MapLibre
 * conserva su instancia, sus tiles y su style entre navegaciones.
 */
const ROUTE_SPLASH_MS = 1500

function AppShell() {
  const { showSplash, progress } = useAppData()
  const location = useLocation()
  const isMapaRoute = location.pathname === '/'

  // Tema fijo por ruta: mapa usa light (basemap claro de Carto), el resto dark.
  // El script en index.html hace el primer paint; este efecto sincroniza en
  // cada navegación client-side.
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isMapaRoute ? 'light' : 'dark',
    )
  }, [isMapaRoute])

  // Splash corto en cada navegación client-side (después del primer render).
  const [routeSplash, setRouteSplash] = useState(false)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setRouteSplash(true)
    const t = window.setTimeout(() => setRouteSplash(false), ROUTE_SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [location.pathname])

  return (
    <>
      {/* Splash: montaje inicial (showSplash) + cada cambio de ruta (routeSplash). */}
      <SplashScreen
        visible={showSplash || routeSplash}
        progress={showSplash ? progress : 100}
      />

      {/* NavBar fija — 3rem de altura (h-12) */}
      <NavBar />

      {/* Contenedor principal — debajo del NavBar */}
      <main
        className="relative w-full"
        style={{
          paddingTop: 'calc(3rem + env(safe-area-inset-top))',
          height: '100dvh',
        }}
      >
        {/* Slot del mapa — siempre montado, alterna visibility */}
        <div
          aria-hidden={!isMapaRoute}
          style={{
            position: 'absolute',
            top: 'calc(3rem + env(safe-area-inset-top))',
            left: 0,
            right: 0,
            bottom: 0,
            visibility: isMapaRoute ? 'visible' : 'hidden',
            pointerEvents: isMapaRoute ? 'auto' : 'none',
            zIndex: isMapaRoute ? 1 : 0,
          }}
        >
          <MapaPage />
        </div>

        {/* Slot de rutas analíticas — solo visible cuando NO estás en "/" */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(3rem + env(safe-area-inset-top))',
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            visibility: isMapaRoute ? 'hidden' : 'visible',
            pointerEvents: isMapaRoute ? 'none' : 'auto',
            zIndex: isMapaRoute ? 0 : 1,
          }}
        >
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* La ruta "/" no renderiza nada en este slot — el mapa vive en el otro */}
              <Route path="/" element={null} />
              <Route path="/dpp" element={<DppPage />} />
              <Route path="/pdi" element={<PdiPage />} />
              <Route path="/fiscalia" element={<FiscaliaPage />} />
              {/* HIDDEN — pendiente datos reales PJud:
              <Route path="/pjud" element={<PjudPage />} />
              <Route path="/embudo" element={<EmbudoPage />} /> */}
              <Route path="/datos" element={<DatosPage />} />
            </Routes>
          </Suspense>
        </div>
      </main>
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
