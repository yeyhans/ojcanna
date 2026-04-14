// frontend/src/hooks/useTheme.ts
//
// Dark es el default. El toggle muta data-theme="light" en <html>
// y persiste la elección en localStorage bajo la key "theme".
//
// El script de restauración vive en index.html (antes del primer paint)
// para evitar FOUC. Este hook solo se usa desde ThemeToggle.

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'

function readStoredTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  return 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme())

  // Sincroniza si alguien más cambia el atributo (ej. otra pestaña).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const v = e.newValue
      if (v === 'light' || v === 'dark') {
        document.documentElement.setAttribute('data-theme', v)
        setThemeState(v)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
