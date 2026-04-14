// frontend/src/components/EmbudoSankey.tsx
// Diagrama de Sankey custom (4 etapas secuenciales) inspirado en estándares UNODC.
// Implementación SVG pura — sin dependencias extra.
import { motion } from 'framer-motion'
import type { EmbudoSankeyResponse } from '../types/embudo'

const STAGE_COLORS: Record<string, string> = {
  policial:        '#dc2626',
  investigativa:   '#0891b2',
  defensorial:     '#ca8a04',
  judicial:        '#16a34a',
}

interface Props {
  data: EmbudoSankeyResponse
  height?: number
}

export function EmbudoSankey({ data, height = 360 }: Props) {
  const { nodos, flujos } = data
  if (!nodos.length) return null

  const maxValue = Math.max(...nodos.map(n => n.n_casos), 1)
  const width = 900
  const padding = { top: 20, bottom: 60, left: 80, right: 80 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const colW = innerW / (nodos.length - 1 || 1)
  const barW = 24

  // X positions per node (equal spacing)
  const xs = nodos.map((_, i) => padding.left + i * colW)
  const heightFor = (n: number) => Math.max(2, (n / maxValue) * innerH)
  const yFor = (n: number) => padding.top + (innerH - heightFor(n)) / 2

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
      style={{ background: '#0f0f0f', borderRadius: 4 }}
    >
      {/* Flujos (paths entre etapas) */}
      {flujos.map((f, i) => {
        const srcIdx = nodos.findIndex(n => n.id === f.source)
        const tgtIdx = nodos.findIndex(n => n.id === f.target)
        if (srcIdx < 0 || tgtIdx < 0) return null
        const srcNode = nodos[srcIdx]
        const tgtNode = nodos[tgtIdx]
        const x0 = xs[srcIdx] + barW / 2
        const x1 = xs[tgtIdx] - barW / 2
        const y0 = yFor(srcNode.n_casos) + heightFor(srcNode.n_casos) / 2
        const y1 = yFor(tgtNode.n_casos) + heightFor(tgtNode.n_casos) / 2
        const h0 = heightFor(srcNode.n_casos)
        const h1 = heightFor(tgtNode.n_casos)
        const cx = (x0 + x1) / 2
        const path = `
          M ${x0} ${y0 - h0 / 2}
          C ${cx} ${y0 - h0 / 2}, ${cx} ${y1 - h1 / 2}, ${x1} ${y1 - h1 / 2}
          L ${x1} ${y1 + h1 / 2}
          C ${cx} ${y1 + h1 / 2}, ${cx} ${y0 + h0 / 2}, ${x0} ${y0 + h0 / 2}
          Z
        `.trim()
        return (
          <motion.path
            key={i}
            d={path}
            fill={f.perdida ? '#3a3a3a' : '#2a2a2a'}
            opacity={0.6}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
          >
            <title>
              {srcNode.label} → {tgtNode.label}: {f.value.toLocaleString('es-CL')}
              {f.perdida ? ' (caída del embudo)' : ''}
            </title>
          </motion.path>
        )
      })}

      {/* Nodos (barras verticales) */}
      {nodos.map((n, i) => {
        const h = heightFor(n.n_casos)
        const y = yFor(n.n_casos)
        const x = xs[i] - barW / 2
        const color = STAGE_COLORS[n.etapa] || '#6b7280'
        return (
          <g key={n.id}>
            <motion.rect
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={color}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ transformOrigin: `${x + barW / 2}px ${y + h / 2}px` }}
            >
              <title>{n.label}: {n.n_casos.toLocaleString('es-CL')}</title>
            </motion.rect>
            <text
              x={xs[i]}
              y={padding.top + innerH + 24}
              fill="#b0b0b0"
              fontSize={11}
              textAnchor="middle"
              fontFamily="monospace"
              style={{ letterSpacing: '0.1em' }}
            >
              {n.fuente}
            </text>
            <text
              x={xs[i]}
              y={padding.top + innerH + 42}
              fill={n.n_casos === 0 ? '#5a5a5a' : '#f8f8f6'}
              fontSize={n.n_casos === 0 ? 11 : 14}
              textAnchor="middle"
              fontFamily="monospace"
              fontStyle={n.n_casos === 0 ? 'italic' : 'normal'}
            >
              {n.n_casos === 0 ? 'sin datos' : n.n_casos.toLocaleString('es-CL')}
            </text>
            <text
              x={xs[i]}
              y={y - 8}
              fill="#8a8a8a"
              fontSize={10}
              textAnchor="middle"
              style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}
            >
              {n.etapa}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
