// frontend/src/App.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { SplashScreen } from './components/SplashScreen'
import { AppDataProvider, useAppData } from './providers/AppDataProvider'
import MapaPage from './pages/MapaPage'

// Lazy: estos chunks se descargan en idle desde AppDataProvider después del
// primer render, así el primer click al NavBar encuentra el chunk listo.
const DppPage = lazy(() => import('./pages/DppPage'))
const PdiPage = lazy(() => import('./pages/PdiPage'))
const EmbudoPage = lazy(() => import('./pages/EmbudoPage'))

function PageFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
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
function AppShell() {
  const { showSplash, progress } = useAppData()
  const location = useLocation()
  const isMapaRoute = location.pathname === '/'

  return (
    <>
      {/* Splash screen: SIEMPRE en cada montaje (modo presentación).
          AppDataProvider ya garantiza una duración mínima de SPLASH_MIN_MS. */}
      <SplashScreen visible={showSplash} progress={progress} />

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
              <Route path="/embudo" element={<EmbudoPage />} />
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
