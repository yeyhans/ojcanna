// frontend/src/components/ui/SegmentedControl.tsx
//
// Segmented control accesible: radio-group visual con chips pegados.
// Mejor UX mobile que un <select>: tap directo a la opción visible.

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={
        'inline-flex items-center p-0.5 bg-[var(--paper-deep)] border border-[var(--card-border)] rounded-sm ' +
        className
      }
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={
              'text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:outline-none ' +
              (active
                ? 'bg-[var(--ink)] text-[var(--paper-deep)]'
                : 'bg-transparent text-[var(--dim)] hover:text-[var(--ink)]')
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
