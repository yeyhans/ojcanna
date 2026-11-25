// frontend/src/components/ui/chartPresets.ts
//
// Presets para Recharts, separados de ChartFrame.tsx para que ese archivo
// exporte sólo componentes (requisito de Fast Refresh).
//
// Pasar a los componentes Recharts con el spread operator.
// NOTA: al usar CSS vars en Recharts hay que inlinear (no class) — Recharts
// lee el valor estático de la prop, no recalcula al cambiar theme.
// La solución: usar valores absolutos o leer var() via getComputedStyle si
// se necesita reactividad. Aquí usamos los colores dark por default; el
// re-render al cambiar theme ocurre porque las páginas re-ejecutan.

export const chartTooltipStyle = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '4px',
  fontSize: '12px',
  color: 'var(--ink)',
  fontFamily: 'JetBrains Mono, monospace',
} as const

export const chartTooltipItemStyle = {
  color: 'var(--ink)',
} as const

export const chartAxisTickStyle = {
  fontSize: 11,
  fill: 'var(--dim)',
  fontFamily: 'JetBrains Mono, monospace',
}

export const chartGridProps = {
  strokeDasharray: '3 3',
  stroke: 'var(--chart-grid)',
  vertical: false,
} as const
