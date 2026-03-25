// frontend/src/components/SubgrupoCheckbox.tsx
interface Props {
  id: string
  nombre: string
  checked: boolean
  onChange: (id: string, checked: boolean) => void
}

export function SubgrupoCheckbox({ id, nombre, checked, onChange }: Props) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(id, e.target.checked)}
        className="
          w-4 h-4 rounded border-slate-300
          text-blue-600 accent-blue-600
          cursor-pointer
        "
      />
      <span className="text-sm text-slate-700 group-hover:text-slate-900 leading-tight">
        {nombre}
      </span>
    </label>
  )
}
