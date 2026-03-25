// frontend/src/components/Legend.tsx
import { PALETTE, NO_DATA } from '../lib/colorScale'

interface Props {
  breaks: number[]
}

export function Legend({ breaks }: Props) {
  if (breaks.length === 0) return null

  const items = [
    { color: NO_DATA, label: 'Sin datos' },
    { color: PALETTE[0], label: `1 – ${Math.round(breaks[0])}` },
    { color: PALETTE[1], label: `${Math.round(breaks[0])} – ${Math.round(breaks[1])}` },
    { color: PALETTE[2], label: `${Math.round(breaks[1])} – ${Math.round(breaks[2])}` },
    { color: PALETTE[3], label: `${Math.round(breaks[2])} – ${Math.round(breaks[3])}` },
    { color: PALETTE[4], label: `> ${Math.round(breaks[3])}` },
  ]

  return (
    <div
      className="
        absolute bottom-8 right-4 z-20
        bg-white/70 backdrop-blur-md
        border border-white/30
        rounded-xl shadow-lg
        px-3 py-3
        min-w-[140px]
      "
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Casos
      </p>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.color} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0 border border-slate-200/50"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
