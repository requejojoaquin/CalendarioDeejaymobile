// =============================================================================
// recurrencia.js - Motor PURO de recurrencia de eventos (sin React, sin estado).
// -----------------------------------------------------------------------------
// Expande eventos repetidos "al vuelo": NO se duplican documentos en Firestore.
// El evento maestro guarda un campo `recurrencia` y la grilla pregunta, por cada
// dia visible, si el evento (o alguna de sus repeticiones) cae en esa fecha.
//
// Modelo de datos guardado en el evento:
//   recurrencia: null            -> no se repite
//   recurrencia: {
//     tipo: 'diaria'|'semanal'|'mensual'|'anual'|'personalizada',
//     intervalo: number >= 1,                // cada cuantas `unidad`
//     unidad: 'dia'|'semana'|'mes'|'anio',   // solo en 'personalizada'
//     hasta: 'YYYY-MM-DD' | null             // fin opcional (inclusive)
//   }
// =============================================================================

// Opciones del desplegable (orden de aparicion en la UI).
export const TIPOS_RECURRENCIA = [
  { tipo: 'none', etiqueta: 'No se repite' },
  { tipo: 'diaria', etiqueta: 'Cada día' },
  { tipo: 'semanal', etiqueta: 'Cada semana' },
  { tipo: 'mensual', etiqueta: 'Cada mes' },
  { tipo: 'anual', etiqueta: 'Cada año' },
  { tipo: 'personalizada', etiqueta: 'Personalizado…' },
]

// Unidades para el panel "Personalizado".
export const UNIDADES_RECURRENCIA = [
  { unidad: 'dia', etiqueta: 'días' },
  { unidad: 'semana', etiqueta: 'semanas' },
  { unidad: 'mes', etiqueta: 'meses' },
  { unidad: 'anio', etiqueta: 'años' },
]

const UNIDAD_POR_TIPO = {
  diaria: 'dia',
  semanal: 'semana',
  mensual: 'mes',
  anual: 'anio',
}

// Parsea "YYYY-MM-DD" como fecha LOCAL (evita el off-by-one de `new Date(str)`,
// que interpreta el string como UTC y resta horas en husos negativos).
export const parseYMD = (s) => {
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate())
  if (typeof s !== 'string') return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// Diferencia en dias-calendario (b - a), robusta ante horario de verano.
const diasEntre = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000)

const indiceMes = (d) => d.getFullYear() * 12 + d.getMonth()

// Normaliza el campo `recurrencia` del evento a {unidad, intervalo, hasta} o null.
export const normalizarRecurrencia = (recur) => {
  if (!recur || !recur.tipo || recur.tipo === 'none') return null
  const intervalo = Math.max(1, Math.floor(Number(recur.intervalo) || 1))
  const unidad = recur.tipo === 'personalizada'
    ? recur.unidad || 'semana'
    : UNIDAD_POR_TIPO[recur.tipo]
  if (!unidad) return null
  return { unidad, intervalo, hasta: recur.hasta || null }
}

// Es `O` (Date) un inicio de ocurrencia valido respecto al inicio base `s`?
const esInicioValido = (O, s, unidad, intervalo) => {
  if (O < s) return false
  switch (unidad) {
    case 'dia':
      return diasEntre(s, O) % intervalo === 0
    case 'semana':
      // multiplo de 7*intervalo dias => mismo dia de semana garantizado.
      return diasEntre(s, O) % (7 * intervalo) === 0
    case 'mes':
      return (
        O.getDate() === s.getDate() &&
        (indiceMes(O) - indiceMes(s)) % intervalo === 0
      )
    case 'anio':
      return (
        O.getDate() === s.getDate() &&
        O.getMonth() === s.getMonth() &&
        (O.getFullYear() - s.getFullYear()) % intervalo === 0
      )
    default:
      return false
  }
}

// El evento `ev` ocurre en la fecha `fechaKey` ("YYYY-MM-DD")?
// Cubre el rango base (ocurrencia 0) Y las repeticiones. Soporta eventos
// multi-dia: cada ocurrencia conserva la duracion del evento maestro.
export const ocurreEnFecha = (ev, fechaKey) => {
  const inicioStr = ev.fechaInicio || ev.fecha
  const finStr = ev.fechaFin || ev.fechaInicio || ev.fecha
  if (!inicioStr) return false

  const recur = normalizarRecurrencia(ev.recurrencia)

  // Sin recurrencia: solo el rango base. Comparar strings "YYYY-MM-DD" es
  // equivalente a comparar cronologicamente (orden lexicografico = temporal).
  if (!recur) {
    return inicioStr <= fechaKey && fechaKey <= finStr
  }

  const s = parseYMD(inicioStr)
  const f = parseYMD(finStr) || s
  const t = parseYMD(fechaKey)
  if (!s || !t) return false

  const durDias = Math.max(0, diasEntre(s, f))
  const hasta = recur.hasta ? parseYMD(recur.hasta) : null

  // Una ocurrencia que cubra `t` debe ARRANCAR en [t - durDias, t]. Iteramos
  // ese rango (acotado por la duracion del evento, NO por que tan lejos se
  // mira al futuro): para eventos de un dia es una sola iteracion.
  for (let off = durDias; off >= 0; off--) {
    const O = new Date(t.getFullYear(), t.getMonth(), t.getDate() - off)
    if (O < s) continue
    if (hasta && O > hasta) continue
    if (esInicioValido(O, s, recur.unidad, recur.intervalo)) return true
  }
  return false
}

// Etiqueta humana para el visor de eventos ("Se repite cada semana", etc.).
export const etiquetaRecurrencia = (recur) => {
  if (!recur || !recur.tipo || recur.tipo === 'none') return null
  if (recur.tipo !== 'personalizada') {
    const preset = TIPOS_RECURRENCIA.find((x) => x.tipo === recur.tipo)
    return preset ? `Se repite ${preset.etiqueta.toLowerCase()}` : null
  }
  const n = Math.max(1, Math.floor(Number(recur.intervalo) || 1))
  const singular = { dia: 'día', semana: 'semana', mes: 'mes', anio: 'año' }
  const plural = { dia: 'días', semana: 'semanas', mes: 'meses', anio: 'años' }
  const u = (n === 1 ? singular : plural)[recur.unidad || 'semana']
  return n === 1 ? `Se repite cada ${u}` : `Se repite cada ${n} ${u}`
}
