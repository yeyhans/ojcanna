// frontend/src/components/Legend.tsx
import { PALETTE, NO_DATA } from '../lib/colorScale'

export function Legend({ breaks }: { breaks: number[] }) {
  if (breaks.length === 0) return null

  const items = [
    { color: NO_DATA, label: 'SIN REGISTRO' },
    { color: PALETTE[0], label: `1 – ${Math.round(breaks[0])}` },
    { color: PALETTE[1], label: `${Math.round(breaks[0])} – ${Math.round(breaks[1])}` },
    { color: PALETTE[2], label: `${Math.round(breaks[1])} – ${Math.round(breaks[2])}` },
    { color: PALETTE[3], label: `${Math.round(breaks[2])} – ${Math.round(breaks[3])}` },
    { color: PALETTE[4], label: `> ${Math.round(breaks[3])}` },
  ]

  return (
    <div className="absolute right-6 z-20 bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#2a2a2a] shadow-2xl p-4 min-w-[160px] bottom-[calc(90px+env(safe-area-inset-bottom,0px))] md:bottom-8 rounded-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b0b0b0] mb-4">
        Intensidad Penal
      </p>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.color} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full border border-[#f8f8f6]/5 shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] font-bold text-[#f8f8f6] tabular-nums whitespace-nowrap">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
