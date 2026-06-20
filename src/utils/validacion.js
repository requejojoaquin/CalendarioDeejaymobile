// =============================================================================
// validacion.js - Helpers puros de validación y saneamiento (sin React)
// -----------------------------------------------------------------------------
// Funciones sin estado ni dependencias, reutilizables en formularios y antes de
// escribir en Firestore. La validación del cliente mejora la UX, pero NO
// reemplaza las reglas de Firestore ni la validación del backend.
// =============================================================================

/**
 * Longitudes máximas (en caracteres) permitidas por campo.
 * @readonly
 */
export const LIMITES = {
  titulo: 100,
  descripcion: 1000,
  ubicacion: 200,
  presupuesto: 100,
  nombreCalendario: 50,
}

/**
 * Normaliza un texto libre: lo fuerza a String, recorta espacios de los
 * extremos, elimina caracteres de control (saltos de línea, tabs, NUL, etc.)
 * y lo trunca a `max` caracteres.
 * @param {*} s - Valor a sanear (cualquier tipo; se convierte a String).
 * @param {number} [max=Infinity] - Largo máximo del resultado.
 * @returns {string} Texto saneado.
 */
export const sanitizarTexto = (s, max = Infinity) => {
  if (s === null || s === undefined) return ''
  let texto = String(s)
  // Elimina caracteres de control C0 (0x00-0x1F), DEL (0x7F) y C1 (0x80-0x9F).
  // Se usan escapes hexadecimales para mantener el archivo en ASCII puro.
  // eslint-disable-next-line no-control-regex
  texto = texto.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
  texto = texto.trim()
  if (Number.isFinite(max) && max >= 0 && texto.length > max) {
    texto = texto.slice(0, max)
  }
  return texto
}

/**
 * Valida un email con una expresión regular razonable (no exhaustiva según
 * RFC, pero suficiente para uso real: algo@dominio.tld sin espacios).
 * @param {*} email
 * @returns {boolean}
 */
export const validarEmail = (email) => {
  if (typeof email !== 'string') return false
  const valor = email.trim()
  if (valor.length === 0 || valor.length > 254) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(valor)
}

/**
 * Valida el formato de una hora "HH:MM" en 24 horas (00:00 a 23:59).
 * @param {string} hora
 * @returns {boolean}
 */
const validarHora = (hora) => {
  if (typeof hora !== 'string') return false
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora.trim())
}

/**
 * Valida los datos de un evento antes de guardarlo.
 *
 * Reglas:
 *  - titulo: requerido y de largo <= LIMITES.titulo.
 *  - descripcion: opcional, largo <= LIMITES.descripcion.
 *  - ubicacion: opcional, largo <= LIMITES.ubicacion.
 *  - fechaInicio / fechaFin: si ambas están presentes, fechaFin >= fechaInicio.
 *  - hora: si está presente, debe cumplir formato HH:MM.
 *
 * @param {Object} datos - { titulo, descripcion, ubicacion, fechaInicio, fechaFin, hora }
 * @returns {{ valido: boolean, errores: Object<string,string> }}
 *          `errores` mapea campo -> mensaje en español. Vacío si todo es válido.
 */
export const validarEvento = (datos) => {
  const errores = {}
  const d = datos || {}

  // --- titulo (requerido) ---
  const titulo = typeof d.titulo === 'string' ? d.titulo.trim() : ''
  if (titulo.length === 0) {
    errores.titulo = 'El título es obligatorio.'
  } else if (titulo.length > LIMITES.titulo) {
    errores.titulo = `El título no puede superar los ${LIMITES.titulo} caracteres.`
  }

  // --- descripcion (opcional) ---
  if (d.descripcion !== null && d.descripcion !== undefined && String(d.descripcion).length > LIMITES.descripcion) {
    errores.descripcion = `La descripción no puede superar los ${LIMITES.descripcion} caracteres.`
  }

  // --- ubicacion (opcional) ---
  if (d.ubicacion !== null && d.ubicacion !== undefined && String(d.ubicacion).length > LIMITES.ubicacion) {
    errores.ubicacion = `La ubicación no puede superar los ${LIMITES.ubicacion} caracteres.`
  }

  // --- rango de fechas (solo si ambas están presentes) ---
  const tieneInicio = d.fechaInicio !== null && d.fechaInicio !== undefined && d.fechaInicio !== ''
  const tieneFin = d.fechaFin !== null && d.fechaFin !== undefined && d.fechaFin !== ''
  if (tieneInicio && tieneFin) {
    // Comparar como Date funciona tanto para strings "YYYY-MM-DD" como para
    // objetos Date. Si alguna no parsea, se marca como inválida.
    const inicio = new Date(d.fechaInicio)
    const fin = new Date(d.fechaFin)
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      errores.fechaFin = 'Las fechas no tienen un formato válido.'
    } else if (fin.getTime() < inicio.getTime()) {
      errores.fechaFin = 'La fecha de fin no puede ser anterior a la de inicio.'
    }
  }

  // --- hora (opcional) ---
  if (d.hora !== null && d.hora !== undefined && d.hora !== '') {
    if (!validarHora(d.hora)) {
      errores.hora = 'La hora debe tener el formato HH:MM (24 horas).'
    }
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  }
}
