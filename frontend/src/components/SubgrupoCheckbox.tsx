// frontend/src/components/SubgrupoCheckbox.tsx
interface Props {
  id: string
  nombre: string
  checked: boolean
  onChange: (id: string, checked: boolean) => void
}

export function SubgrupoCheckbox({ id, nombre, checked, onChange }: Props) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-1.5 px-2 rounded hover:bg-[#f8f8f6]/5 transition-colors">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(id, e.target.checked)}
          className="peer appearance-none w-4 h-4 border border-[#2a2a2a] rounded bg-[#1a1a1a] checked:bg-[#f8f8f6] checked:border-[#f8f8f6] transition-all cursor-pointer"
        />
        <svg 
          className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth="4"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-[11px] font-bold tracking-tight text-[#b0b0b0] group-hover:text-[#f8f8f6] uppercase transition-colors">
        {nombre}
      </span>
    </label>
  )
}
