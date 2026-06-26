// =============================================================================
// Paleta de colores compartida + persistencia de colores personalizados.
// -----------------------------------------------------------------------------
// Inspirado en Google Calendar (paleta ampliada + color libre) y Apple Calendar
// (grilla de presets + custom). Los colores que el usuario crea con el gotero se
// guardan en localStorage y se pueden quitar luego. Un único origen de verdad
// usado por el selector de color de eventos Y de calendarios.
// =============================================================================

// Paleta base (18 colores, 3 filas de 6). Tonos vivos y distinguibles.
export const PALETA_COLORES = [
  '#d50000', '#e67c73', '#f4511e', '#ef6c00', '#f6bf26', '#fdd835',
  '#c0ca33', '#7cb342', '#0b8043', '#009688', '#039be5', '#4285f4',
  '#3f51b5', '#7986cb', '#8e24aa', '#d81b60', '#795548', '#616161',
]

const STORAGE_KEY = 'mc:colores-personalizados'
const MAX_PERSONALIZADOS = 12

// Normaliza a hex en minúsculas para comparar/deduplicar sin sorpresas.
export const normalizarColor = (c) => (typeof c === 'string' ? c.trim().toLowerCase() : c)

// ¿El color ya está en la paleta base? (no tiene sentido "guardarlo").
export const esColorBase = (color) =>
  PALETA_COLORES.some((c) => normalizarColor(c) === normalizarColor(color))

export function leerColoresPersonalizados() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(v) ? v.filter((c) => typeof c === 'string') : []
  } catch {
    return []
  }
}

export function guardarColoresPersonalizados(lista) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, MAX_PERSONALIZADOS)))
  } catch {
    /* almacenamiento no disponible: degradar en silencio */
  }
}

export { MAX_PERSONALIZADOS }
