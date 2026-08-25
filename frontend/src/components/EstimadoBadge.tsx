// frontend/src/components/EstimadoBadge.tsx
// Marcador visual compartido para datos derivados/estimados (no oficiales).
// Convención única reutilizada en: tabla Embudo, gráfico Embudo y (Fase 2) mapa DPP/PDI.

interface Props {
  label?: string
  title?: string
  className?: string
}

export function EstimadoBadge({
  label = '≈ estimado',
  title = 'Valor derivado por distribución proporcional, no un dato oficial directo.',
  className = '',
}: Props) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200 ${className}`}
    >
      {label}
    </span>
  )
}
