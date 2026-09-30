import { useCallback, useEffect, useState } from 'react'

/**
 * Estado persistido en localStorage. Tolera navegadores sin acceso a storage
 * (modo privado, cookies bloqueadas) cayendo a estado en memoria.
 */
export function useStoredState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Sin storage disponible: el estado vive solo en memoria.
    }
  }, [key, value])

  const update = useCallback((next: T) => setValue(next), [])

  return [value, update]
}
