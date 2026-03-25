// frontend/src/components/ComunaTooltip.tsx
import type { CeadFeatureProperties } from '../types/cead'

interface Props {
  feature: { properties: CeadFeatureProperties } | null
  x: number
  y: number
}

export function ComunaTooltip({ feature, x, y }: Props) {
  if (!feature) return null

  const { nombre, frecuencia_total, tasa_agregada } = feature.properties

  return (
    <div
      className="
        pointer-events-none fixed z-50
        bg-white/75 backdrop-blur-md
        border border-white/30
        rounded-xl shadow-lg
        px-4 py-3 min-w-[180px]
      "
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-semibold text-slate-800 text-sm leading-tight mb-2">
        {nombre}
      </p>
      <div className="flex flex-col gap-1">
        <div>
          <span className="text-2xl font-bold text-blue-700 leading-none">
            {Math.round(frecuencia_total).toLocaleString('es-CL')}
          </span>
          <span className="text-slate-500 text-xs ml-1">casos</span>
        </div>
        <p className="text-slate-500 text-xs">
          {tasa_agregada.toFixed(1)} por 100k hab.
        </p>
      </div>
    </div>
  )
}
