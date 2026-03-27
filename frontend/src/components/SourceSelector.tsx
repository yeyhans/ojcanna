// frontend/src/components/SourceSelector.tsx
// Tabs para cambiar entre fuentes de datos disponibles en el Observatorio.
import type { FuenteId, FuenteInfo } from '../types/common'

interface Props {
  fuentes: FuenteInfo[]
  selected: FuenteId
  onSelect: (id: FuenteId) => void
}

export function SourceSelector({ fuentes, selected, onSelect }: Props) {
  return (
    <div
      className="
        flex gap-1 p-1
        bg-white/60 backdrop-blur-md
        border border-white/30
        rounded-xl shadow-md shadow-slate-200/50
      "
    >
      {fuentes.map((f) => (
        <button
          key={f.id}
          onClick={() => f.disponible && onSelect(f.id)}
          title={f.descripcion}
          disabled={!f.disponible}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
            ${selected === f.id
              ? 'bg-blue-600 text-white shadow-sm'
              : f.disponible
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-slate-300 cursor-not-allowed'
            }
          `}
        >
          {f.label}
          {!f.disponible && (
            <span className="ml-1 text-[10px] font-normal opacity-70">pronto</span>
          )}
        </button>
      ))}
    </div>
  )
}
