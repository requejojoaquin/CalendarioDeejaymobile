import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCalendario } from '../../context/CalendarioContext'
import {
  ArrowLeft,
  Trash2,
  Search,
  RotateCcw,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react'
import {
  spring,
  staggerContainer,
  fadeUpItem,
  tap,
  tapSoft,
} from '../../lib/motion'

// Formatea una fecha ISO ("YYYY-MM-DD" o ISO completa) a algo legible en es-ES.
// Devuelve la cadena original si no parsea, y vacío si no hay valor.
const formatearFecha = (valor) => {
  if (!valor) return ''
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return String(valor)
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Formatea fecha + hora del borrado ("eliminado el ...").
const formatearBorrado = (valor) => {
  if (!valor) return ''
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Clave de orden por fecha del evento (ascendente). Las fechas inválidas o
// ausentes se mandan al final (Infinity) para no romper el orden.
const claveFecha = (ev) => {
  const valor = ev.fechaInicio || ev.fecha
  if (!valor) return Infinity
  const t = new Date(valor).getTime()
  return Number.isNaN(t) ? Infinity : t
}

// Botón de texto (spec): cómodo, label separado del borde, touch target accesible.
const btnTexto =
  'inline-flex items-center justify-center gap-2 px-4 min-h-[40px] text-sm font-medium ' +
  'rounded-[var(--radius-md)] transition-colors ' +
  'focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

// Botón de solo icono (spec): cuadrado 40px, requiere aria-label.
const btnIcono =
  'inline-flex items-center justify-center h-10 w-10 rounded-[var(--radius-md)] transition-colors ' +
  'focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]'

function PaginaPapelera({ onClose }) {
  const {
    eventosPapelera,
    calendarios,
    restaurarEvento,
    eliminarDefinitivo,
    vaciarPapelera,
  } = useCalendario()

  const [busqueda, setBusqueda] = useState('')
  // Confirmación de vaciado por estado (en vez de window.confirm).
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false)
  // Id de la fila pendiente de confirmar eliminación definitiva (o null).
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(null)
  // Bandera mientras corre una acción asíncrona (deshabilita botones).
  const [procesando, setProcesando] = useState(false)

  // Escape: si hay una confirmación abierta la cancela; si no, cierra la página.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      if (confirmandoVaciar) {
        setConfirmandoVaciar(false)
      } else if (confirmandoEliminar) {
        setConfirmandoEliminar(null)
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, confirmandoVaciar, confirmandoEliminar])

  // Mapa id -> calendario para pintar nombre y color de cada evento.
  const calendarioPorId = useMemo(() => {
    const mapa = {}
    calendarios.forEach((c) => {
      mapa[c.id] = c
    })
    return mapa
  }, [calendarios])

  // Lista visible: filtra por título/descripción (case-insensitive) y ordena
  // por fecha del evento ascendente. Derivado en render (sin estado extra).
  const eventosVisibles = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    const filtrados = term
      ? eventosPapelera.filter(
          (ev) =>
            ev.titulo?.toLowerCase().includes(term) ||
            ev.descripcion?.toLowerCase().includes(term),
        )
      : eventosPapelera
    return [...filtrados].sort((a, b) => claveFecha(a) - claveFecha(b))
  }, [busqueda, eventosPapelera])

  const vacia = eventosPapelera.length === 0
  const sinResultados = !vacia && eventosVisibles.length === 0

  const handleRestaurar = async (id) => {
    if (procesando) return
    setProcesando(true)
    try {
      await restaurarEvento(id)
    } finally {
      setProcesando(false)
    }
  }

  const handleEliminar = async (id) => {
    if (procesando) return
    setProcesando(true)
    try {
      await eliminarDefinitivo(id)
      setConfirmandoEliminar(null)
    } finally {
      setProcesando(false)
    }
  }

  const handleVaciar = async () => {
    if (procesando) return
    setProcesando(true)
    try {
      await vaciarPapelera()
      setConfirmandoVaciar(false)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[2500] bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Papelera de eventos"
      initial={{ x: '100%' }}
      animate={{ x: 0, transition: spring }}
      exit={{ x: '100%', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
    >
      {/* Barra superior */}
      <div className="flex items-center gap-3 px-4 sm:px-6 h-16 flex-shrink-0 border-b border-[var(--border-color)]">
        <motion.button
          whileTap={tap}
          type="button"
          onClick={onClose}
          aria-label="Volver"
          className={`${btnIcono} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)]`}
        >
          <ArrowLeft size={20} />
        </motion.button>

        <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <Trash2 size={20} className="text-[var(--text-secondary)]" />
          Papelera
        </h1>

        <div className="flex-1 min-w-0" />

        {/* Vaciar papelera: confirmación inline (sin window.confirm). */}
        {!vacia &&
          (confirmandoVaciar ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-[var(--text-secondary)]">
                ¿Vaciar todo?
              </span>
              <motion.button
                whileTap={tapSoft}
                type="button"
                onClick={() => setConfirmandoVaciar(false)}
                disabled={procesando}
                className={`${btnTexto} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)]`}
              >
                Cancelar
              </motion.button>
              <motion.button
                whileTap={tapSoft}
                type="button"
                onClick={handleVaciar}
                disabled={procesando}
                className={`${btnTexto} text-white active:scale-[0.98]`}
                style={{ backgroundColor: 'var(--danger-color)' }}
              >
                {procesando && (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin-slow" />
                )}
                Vaciar
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={tapSoft}
              type="button"
              onClick={() => setConfirmandoVaciar(true)}
              className={`${btnTexto} text-[var(--danger-color)] hover:bg-[var(--danger-soft)] active:scale-[0.98]`}
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">Vaciar papelera</span>
            </motion.button>
          ))}
      </div>

      {/* Buscador */}
      <div className="flex-shrink-0 border-b border-[var(--border-color)] px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--radius-md)] pl-3.5 pr-3 min-h-[44px] transition-colors focus-within:border-[var(--accent-color)] focus-within:shadow-[var(--ring-accent)] focus-within:bg-[var(--bg-primary)]">
            <Search size={18} className="text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en la papelera..."
              aria-label="Buscar en la papelera"
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
            />
          </div>
        </div>
      </div>

      {/* Lista (scroll propio) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full px-6 py-6">
          {vacia || sinResultados ? (
            // Empty state (vacía o sin coincidencias del buscador)
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
              className="flex flex-col items-center justify-center text-center px-8 py-20 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)]">
                <Trash2 size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {vacia ? 'La papelera está vacía' : 'Sin resultados'}
                </p>
                <p className="text-sm text-[var(--text-secondary)] max-w-[300px]">
                  {vacia
                    ? 'Los eventos que elimines aparecerán aquí y podrás restaurarlos.'
                    : 'Ningún evento de la papelera coincide con tu búsqueda.'}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.ul
              className="flex flex-col gap-2"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence initial={false}>
                {eventosVisibles.map((ev) => {
                  const cal = calendarioPorId[ev.calendarioId]
                  const color = ev.color || cal?.color || 'var(--text-tertiary)'
                  const fecha = formatearFecha(ev.fechaInicio || ev.fecha)
                  const borrado = formatearBorrado(ev.deletedAt)
                  const confirmando = confirmandoEliminar === ev.id
                  return (
                    <motion.li
                      key={ev.id}
                      layout
                      variants={fadeUpItem}
                      exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
                      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                    >
                      <div className="flex items-start gap-3 px-4 py-3.5">
                        <span
                          className="mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/5"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {ev.titulo || '(Sin título)'}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-[var(--text-secondary)]">
                            {fecha && (
                              <span className="inline-flex items-center gap-1 font-num">
                                <CalendarDays size={12} />
                                {fecha}
                              </span>
                            )}
                            {cal?.nombre && (
                              <>
                                <span className="text-[var(--text-tertiary)]">·</span>
                                <span className="truncate">{cal.nombre}</span>
                              </>
                            )}
                          </div>
                          {(borrado || ev.deletedBy) && (
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-1 truncate">
                              Eliminado
                              {ev.deletedBy ? ` por ${ev.deletedBy}` : ''}
                              {borrado ? ` · ${borrado}` : ''}
                            </p>
                          )}
                        </div>

                        {/* Acciones por fila */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {confirmando ? (
                            <>
                              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--danger-color)]">
                                <AlertTriangle size={14} />
                                ¿Eliminar?
                              </span>
                              <motion.button
                                whileTap={tapSoft}
                                type="button"
                                onClick={() => setConfirmandoEliminar(null)}
                                disabled={procesando}
                                className={`${btnTexto} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)]`}
                              >
                                Cancelar
                              </motion.button>
                              <motion.button
                                whileTap={tapSoft}
                                type="button"
                                onClick={() => handleEliminar(ev.id)}
                                disabled={procesando}
                                className={`${btnTexto} text-white active:scale-[0.98]`}
                                style={{ backgroundColor: 'var(--danger-color)' }}
                              >
                                {procesando && (
                                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin-slow" />
                                )}
                                Eliminar
                              </motion.button>
                            </>
                          ) : (
                            <>
                              <motion.button
                                whileTap={tap}
                                type="button"
                                onClick={() => handleRestaurar(ev.id)}
                                disabled={procesando}
                                aria-label={`Restaurar ${ev.titulo || 'evento'}`}
                                className={`${btnTexto} text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--hover-color)] hover:border-[var(--accent-color)] active:scale-[0.98]`}
                              >
                                <RotateCcw size={18} />
                                <span className="hidden sm:inline">Restaurar</span>
                              </motion.button>
                              <motion.button
                                whileTap={tap}
                                type="button"
                                onClick={() => setConfirmandoEliminar(ev.id)}
                                aria-label={`Eliminar definitivamente ${ev.titulo || 'evento'}`}
                                className={`${btnIcono} text-[var(--danger-color)] hover:bg-[var(--danger-soft)] active:scale-[0.98]`}
                              >
                                <Trash2 size={18} />
                              </motion.button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default PaginaPapelera
