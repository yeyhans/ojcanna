import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Aislamos las dependencias pesadas en chunks propios para que el
        // bundle inicial sólo cargue lo necesario para el primer paint del
        // mapa. Recharts (~100KB gz) y framer-motion sólo entran en cache
        // del browser cuando el usuario navega a una página analítica.
        // Vite 8 (rolldown) sólo acepta `manualChunks` como función.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('maplibre-gl') || id.includes('react-map-gl')) return 'maplibre'
          if (id.includes('recharts')) return 'recharts'
          if (id.includes('framer-motion')) return 'framer'
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router')
          ) return 'react'
          return undefined
        },
      },
    },
  },
})
