import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCalendario } from '../../context/CalendarioContext'
import { useAuth } from '../../context/AuthContext'
import { puedeEditar, puedeVerPresupuesto } from '../../utils/permisos'
import { scrimVariants, popVariants, staggerContainer, fadeUpItem, tap } from '../../lib/motion'
import { etiquetaRecurrencia, parseYMD } from '../../utils/recurrencia'
import { Pencil, Trash2, MapPin, AlignLeft, Users, Banknote, Clock, Repeat, X } from 'lucide-react'

// Formatea una fecha ("YYYY-MM-DD" o ISO) a "lunes, 5 de junio".
const formatearFecha = (valor) => {
  // parseYMD interpreta "YYYY-MM-DD" como fecha LOCAL (evita el off-by-one que
  // hacía `new Date('2026-06-20')` => 19 a las 21:00 en husos negativos).
  const d = parseYMD(valor)
  if (!d) return ''
  const texto = d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  // Capitaliza solo la primera letra (no cada palabra): "Sábado, 20 de junio".
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function VisualizadorEvento({ evento, onClose, onEdit }) {
  const { calendarios, eliminarEvento, getPresupuesto } = useCalendario()
  const { rol } = useAuth()

  const puedeGestionar = puedeEditar(rol)
  const calendario = calendarios.find((c) => c.id === evento.calendarioId)
  const colorEvento = evento.color || calendario?.color || '#1a73e8'
  // Etiqueta legible de la repetición ("Se repite cada semana"), o null.
  const labelRecurrencia = etiquetaRecurrencia(evento.recurrencia)

  // Presupuesto: solo si el rol puede verlo Y existe en el contexto.
  const presupuesto = puedeVerPresupuesto(rol) ? getPresupuesto(evento.id) : undefined

  // Cerrar con la tecla Escape.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleEliminar = () => {
    if (!puedeGestionar) return
    if (window.confirm('¿Seguro que quieres mover este evento a la papelera?')) {
      eliminarEvento(evento.id)
      onClose()
    }
  }

  // Rango de fechas: usa fechaInicio (con fallback a fecha legacy) y fechaFin.
  const fechaInicio = evento.fechaInicio || evento.fecha
  const fechaFin = evento.fechaFin
  const inicioFmt = formatearFecha(fechaInicio)
  const finFmt = formatearFecha(fechaFin)
  // Mostramos rango solo si fechaFin existe y difiere del inicio.
  const hayRango = !!fechaFin && fechaFin !== fechaInicio && !!finFmt

  // Hora: null/ausente => todo el día.
  const esTodoElDia = evento.todoElDia || !evento.hora
  let textoHorario
  if (hayRango) {
    textoHorario = `${inicioFmt} → ${finFmt}`
  } else if (esTodoElDia) {
    textoHorario = `${inicioFmt} · Todo el día`
  } else {
    textoHorario = `${inicioFmt} · ${evento.hora}`
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={evento.titulo || 'Detalle del evento'}
      variants={scrimVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        variants={popVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Barra de color superior (identidad del calendario) */}
        <div className="h-1.5 w-full" style={{ backgroundColor: colorEvento }} />

        {/* Acciones */}
        <div className="flex justify-end items-center px-4 pt-2 gap-0.5">
          {puedeGestionar && (
            <>
              <motion.button
                onClick={onEdit}
                aria-label="Editar evento"
                title="Editar"
                whileTap={tap}
                className="flex items-center justify-center w-9 h-9 hover:bg-[var(--hover-color)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
              >
                <Pencil size={18} />
              </motion.button>
              <motion.button
                onClick={handleEliminar}
                aria-label="Eliminar evento"
                title="Eliminar"
                whileTap={tap}
                className="flex items-center justify-center w-9 h-9 hover:bg-[var(--danger-soft)] rounded-full text-[var(--text-secondary)] hover:text-[var(--danger-color)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-color)]"
              >
                <Trash2 size={18} />
              </motion.button>
            </>
          )}
          <motion.button
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
            whileTap={tap}
            className="flex items-center justify-center w-9 h-9 hover:bg-[var(--hover-color)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
          >
            <X size={20} />
          </motion.button>
        </div>

        <motion.div
          className="px-8 pb-6 pt-1 space-y-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Título + horario */}
          <motion.div className="flex items-start gap-4" variants={fadeUpItem}>
            <span
              className="w-4 h-4 rounded-[5px] mt-1 flex-shrink-0 ring-1 ring-black/5"
              style={{ backgroundColor: colorEvento }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[var(--text-primary)] leading-snug break-words">
                {evento.titulo || '(Sin título)'}
              </h2>
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mt-2">
                <Clock size={14} className="flex-shrink-0" />
                <span className="tabular-nums">{textoHorario}</span>
              </div>
            </div>
          </motion.div>

          {/* Repetición */}
          {labelRecurrencia && (
            <motion.div className="flex items-start gap-4" variants={fadeUpItem}>
              <div className="w-5 flex justify-center text-[var(--text-secondary)] pt-0.5 flex-shrink-0">
                <Repeat size={18} />
              </div>
              <span className="text-sm text-[var(--text-primary)] leading-relaxed">
                {labelRecurrencia}
              </span>
            </motion.div>
          )}

          {/* Ubicación */}
          {evento.ubicacion && (
            <motion.div className="flex items-start gap-4" variants={fadeUpItem}>
              <div className="w-5 flex justify-center text-[var(--text-secondary)] pt-0.5 flex-shrink-0">
                <MapPin size={18} />
              </div>
              <span className="text-sm text-[var(--text-primary)] leading-relaxed break-words">
                {evento.ubicacion}
              </span>
            </motion.div>
          )}

          {/* Invitados */}
          {evento.invitados && evento.invitados.length > 0 && (
            <motion.div className="flex items-start gap-4" variants={fadeUpItem}>
              <div className="w-5 flex justify-center text-[var(--text-secondary)] pt-0.5 flex-shrink-0">
                <Users size={18} />
              </div>
              <div className="flex flex-wrap gap-2">
                {evento.invitados.map((inv) => (
                  <span
                    key={inv.id || inv.email}
                    className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-3 py-1 rounded-full border border-[var(--border-color)] font-medium"
                  >
                    {inv.email}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Descripción */}
          {evento.descripcion && (
            <motion.div className="flex items-start gap-4" variants={fadeUpItem}>
              <div className="w-5 flex justify-center text-[var(--text-secondary)] pt-0.5 flex-shrink-0">
                <AlignLeft size={18} />
              </div>
              <span className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words leading-relaxed">
                {evento.descripcion}
              </span>
            </motion.div>
          )}

          {/* Presupuesto (solo admin y si hay valor) */}
          {presupuesto && (
            <motion.div className="flex items-start gap-4 pt-4 border-t border-[var(--border-color)]" variants={fadeUpItem}>
              <div className="w-5 flex justify-center text-[var(--text-secondary)] pt-0.5 flex-shrink-0">
                <Banknote size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)]">
                  Presupuesto
                </p>
                <span className="text-sm font-semibold text-[var(--text-primary)] break-words">
                  {presupuesto}
                </span>
              </div>
            </motion.div>
          )}

          {/* Calendario */}
          <motion.div className="flex items-center gap-4 text-[var(--text-secondary)] pt-1" variants={fadeUpItem}>
            <div className="w-5 flex justify-center flex-shrink-0">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: colorEvento }}
                aria-hidden="true"
              />
            </div>
            <span className="text-xs font-medium truncate">
              {calendario?.nombre || 'Sin calendario'}
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default VisualizadorEvento
