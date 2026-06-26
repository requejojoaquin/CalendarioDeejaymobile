import { useState, useCallback } from 'react'
import {
  leerColoresPersonalizados,
  guardarColoresPersonalizados,
  normalizarColor,
  esColorBase,
  MAX_PERSONALIZADOS,
} from '../utils/colores'

// Maneja la lista de colores que el usuario guardó con el gotero.
// `agregar` ignora duplicados y colores que ya están en la paleta base.
// `quitar` elimina un color guardado. Ambos persisten en localStorage.
export function useColoresPersonalizados() {
  const [colores, setColores] = useState(leerColoresPersonalizados)

  const agregar = useCallback((color) => {
    setColores((prev) => {
      const norm = normalizarColor(color)
      if (!norm || esColorBase(norm) || prev.some((c) => normalizarColor(c) === norm)) {
        return prev
      }
      const next = [color, ...prev].slice(0, MAX_PERSONALIZADOS)
      guardarColoresPersonalizados(next)
      return next
    })
  }, [])

  const quitar = useCallback((color) => {
    setColores((prev) => {
      const norm = normalizarColor(color)
      const next = prev.filter((c) => normalizarColor(c) !== norm)
      guardarColoresPersonalizados(next)
      return next
    })
  }, [])

  return { colores, agregar, quitar }
}
