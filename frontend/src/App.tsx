// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import MapaPage from './pages/MapaPage'
import DppPage from './pages/DppPage'
import PdiPage from './pages/PdiPage'
import EmbudoPage from './pages/EmbudoPage'

export default function App() {
  return (
    <BrowserRouter>
      {/* NavBar fija — 3rem de altura (h-12) */}
      <NavBar />

      {/* Contenido debajo del NavBar */}
      <div className="h-[100dvh] flex flex-col" style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}>
        <Routes>
          {/* Mapa CEAD — ocupa todo el espacio disponible */}
          <Route path="/" element={
            <div className="flex-1 relative overflow-hidden">
              <MapaPage />
            </div>
          } />

          {/* Páginas analíticas — scroll */}
          <Route path="/dpp"    element={<div className="flex-1 overflow-y-auto"><DppPage /></div>} />
          <Route path="/pdi"    element={<div className="flex-1 overflow-y-auto"><PdiPage /></div>} />
          <Route path="/embudo" element={<div className="flex-1 overflow-y-auto"><EmbudoPage /></div>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
