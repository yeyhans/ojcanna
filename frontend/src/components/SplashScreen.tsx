// frontend/src/components/SplashScreen.tsx
//
// Splash screen "Deep Tech Premium" que aparece en la primera visita mientras
// se pre-fetcha el GeoJSON de 344 comunas.
//
// Diseño: fondo Jet (#0d0d0d) + CalSans extralight + tracking negativo en títulos
// + barra de progreso Framer Motion + ghost typography + dot grid.
//
// Se oculta con un fade-out suave cuando isAppReady = true.

import { AnimatePresence, motion } from 'framer-motion'

interface SplashScreenProps {
  visible: boolean
  /** 0-100, pasos reales: 33% filtros · 66% geometrías · 100% stats */
  progress: number
}

export function SplashScreen({ visible, progress }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 'clamp(2rem, 6vw, 5rem)',
            backgroundColor: '#0d0d0d',
            // Dot grid sutil
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            overflow: 'hidden',
          }}
        >
          {/* Tag superior izquierdo */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{
              position: 'absolute',
              top: 'clamp(1.5rem, 4vw, 2.5rem)',
              left: 'clamp(2rem, 6vw, 5rem)',
              fontFamily: 'CalSans, sans-serif',
              fontSize: '9px',
              letterSpacing: '3.5px',
              color: 'rgba(255,255,255,0.28)',
              textTransform: 'uppercase',
            }}
          >
            Chile · Ley N° 20.000
          </motion.div>

          {/* Divisor horizontal superior */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'clamp(1.5rem, 4vw, 2.5rem)',
              right: 'clamp(2rem, 6vw, 5rem)',
              width: '24px',
              height: '2px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              transformOrigin: 'left center',
            }}
          />

          {/* Títulos principales */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: '3rem' }}
          >
            <div
              style={{
                fontFamily: 'CalSans, sans-serif',
                fontSize: 'clamp(2.8rem, 7.5vw, 6.5rem)',
                fontWeight: 200,
                lineHeight: 0.9,
                letterSpacing: 'clamp(-2px, -0.03em, -4px)',
                color: '#ffffff',
              }}
            >
              OBSERVATORIO
            </div>
            <div
              style={{
                fontFamily: 'CalSans, sans-serif',
                fontSize: 'clamp(2.8rem, 7.5vw, 6.5rem)',
                fontWeight: 200,
                lineHeight: 0.9,
                letterSpacing: 'clamp(-2px, -0.03em, -4px)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              JUDICIAL
            </div>
            <div
              style={{
                fontFamily: 'CalSans, sans-serif',
                fontSize: 'clamp(2.8rem, 7.5vw, 6.5rem)',
                fontWeight: 200,
                lineHeight: 0.9,
                letterSpacing: 'clamp(-2px, -0.03em, -4px)',
                color: 'rgba(255,255,255,0.2)',
              }}
            >
              CANNÁBICO
            </div>
          </motion.div>

          {/* Barra de progreso + labels */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            style={{ width: 'clamp(200px, 30vw, 320px)' }}
          >
            {/* Rail */}
            <div
              style={{
                width: '100%',
                height: '1px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                position: 'relative',
                marginBottom: '10px',
              }}
            >
              {/* Fill */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  backgroundColor: 'rgba(255,255,255,0.65)',
                  width: `${Math.min(progress, 100)}%`,
                  transition: 'width 0.25s ease',
                }}
              />
            </div>

            {/* Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: 'CalSans, sans-serif',
                  fontSize: '9px',
                  letterSpacing: '2.5px',
                  color: 'rgba(255,255,255,0.28)',
                  textTransform: 'uppercase',
                }}
              >
                Cargando datos
              </span>
              <span
                style={{
                  fontFamily: 'CalSans, sans-serif',
                  fontSize: '9px',
                  letterSpacing: '1px',
                  color: 'rgba(255,255,255,0.15)',
                }}
              >
                346 comunas · CEAD
              </span>
            </div>
          </motion.div>

          {/* Ghost typography de fondo */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: '-0.08em',
              right: '-0.04em',
              fontFamily: 'CalSans, sans-serif',
              fontSize: 'clamp(8rem, 22vw, 20rem)',
              fontWeight: 200,
              color: 'rgba(255,255,255,0.025)',
              lineHeight: 1,
              userSelect: 'none',
              pointerEvents: 'none',
              letterSpacing: '-4px',
            }}
          >
            CEAD
          </div>

          {/* Chip bottom derecho */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{
              position: 'absolute',
              bottom: 'clamp(1.5rem, 4vw, 2.5rem)',
              right: 'clamp(2rem, 6vw, 5rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.25)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'CalSans, sans-serif',
                fontSize: '9px',
                letterSpacing: '2px',
                color: 'rgba(255,255,255,0.2)',
                textTransform: 'uppercase',
              }}
            >
              Mapa Judicial
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
