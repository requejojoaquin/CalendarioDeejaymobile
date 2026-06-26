import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCalendario } from '../../context/CalendarioContext'
import { useAuth } from '../../context/AuthContext'
import { puedeEditar } from '../../utils/permisos'
import { Plus, ChevronLeft, ChevronRight, MoreVertical, Eye, Trash2, Check, AlertTriangle } from 'lucide-react'
import { spring, menuVariants, staggerContainer, fadeUpItem, tap, tapSoft, scrimVariants, popVariants } from '../../lib/motion'
import SelectorColor from '../common/SelectorColor'

const DIAS_MINI = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Paleta de colores para calendarios (azules/Google).
const COLORES = ['#1a73e8', '#d50000', '#33b679', '#f4511e', '#8e24aa', '#f6bf26']

// Dimensiones aproximadas del menú contextual, para posicionarlo sin que se
// salga del viewport. El ancho coincide con la clase `w-60` (240px). El alto
// depende del rol: admin ve swatches de color + "Eliminar".
const MENU_ANCHO = 240
const MENU_ALTO_ADMIN = 230
const MENU_ALTO_BASE = 56
const MENU_GAP = 6

function Sidebar({ mesActual, anioActual, onDiaClick, onCrearEvento, onMesAnterior, onMesSiguiente, onCerrarMobile }) {
  const hoy = new Date()
  const {
    eventos,
    calendarios,
    toggleCalendarioVisible,
    agregarCalendario,
    verSoloEsteCalendario,
    cambiarColorCalendario,
    eliminarCalendario
  } = useCalendario()
  const { rol } = useAuth()
  const puedeGestionar = puedeEditar(rol)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoColor, setNuevoColor] = useState(COLORES[0])

  const [menuAbiertoId, setMenuAbiertoId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, origin: 'top left' })

  // Calendario pendiente de confirmar borrado (null = sin diálogo abierto).
  const [calAEliminar, setCalAEliminar] = useState(null)

  // Cierra el menú contextual al hacer click afuera o con Escape.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuAbiertoId && !event.target.closest('.dots-menu-container') && !event.target.closest('.fixed-menu')) {
        setMenuAbiertoId(null)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMenuAbiertoId(null)
        setCalAEliminar(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [menuAbiertoId])

  // Conjunto de fechas (YYYY-MM-DD) del mes visible que tienen al menos un
  // evento de un calendario visible. Se usa para pintar el punto indicador.
  const diasConEventos = useMemo(() => {
    const set = new Set()
    eventos.forEach((ev) => {
      const esVisible = calendarios.find(c => c.id === ev.calendarioId)?.visible !== false
      if (!esVisible) return
      const inicio = ev.fechaInicio || ev.fecha
      const fin = ev.fechaFin || ev.fecha
      if (!inicio) return
      const dInicio = new Date(`${inicio}T00:00:00`)
      const dFin = new Date(`${fin || inicio}T00:00:00`)
      for (let d = new Date(dInicio); d <= dFin; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === anioActual && d.getMonth() === mesActual) {
          set.add(d.getDate())
        }
      }
    })
    return set
  }, [eventos, calendarios, mesActual, anioActual])

  const generarDiasMini = () => {
    const primerDia = new Date(anioActual, mesActual, 1).getDay()
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
    const dias = []
    for (let i = 0; i < primerDia; i++) dias.push(null)
    for (let i = 1; i <= diasEnMes; i++) dias.push(i)
    return dias
  }

  const handleCrearCalendario = (e) => {
    e.preventDefault()
    if (!nuevoNombre.trim()) return
    agregarCalendario({ nombre: nuevoNombre, color: nuevoColor })
    setNuevoNombre('')
    setMostrarForm(false)
  }

  const handleAbrirMenu = (e, id) => {
    e.stopPropagation()
    // Toggle: si ya estaba abierto este menú, lo cerramos sin recalcular.
    if (menuAbiertoId === id) {
      setMenuAbiertoId(null)
      return
    }
    // Posicionamos el menú (position: fixed) JUNTO al botón de 3-puntitos,
    // ajustando para que nunca se salga del viewport.
    const r = e.currentTarget.getBoundingClientRect()
    const altoMenu = puedeGestionar ? MENU_ALTO_ADMIN : MENU_ALTO_BASE

    // Horizontal: por defecto alineado al borde izquierdo del botón. Si se
    // saldría por la derecha, lo alineamos al borde derecho del botón.
    let left = r.left
    if (left + MENU_ANCHO > window.innerWidth) {
      left = r.right - MENU_ANCHO
    }
    left = Math.max(8, left) // margen mínimo al borde izquierdo

    // Vertical: por defecto debajo del botón. Si no entra abajo, abrimos arriba.
    let top = r.bottom + MENU_GAP
    let origin = 'top left'
    if (top + altoMenu > window.innerHeight && r.top - altoMenu - MENU_GAP > 0) {
      top = r.top - altoMenu - MENU_GAP
      origin = 'bottom left'
    }

    setMenuPos({ top, left, origin })
    setMenuAbiertoId(id)
  }

  // Abre el diálogo de confirmación de borrado (cierra el menú contextual).
  const handlePedirEliminar = (cal) => {
    setCalAEliminar(cal)
    setMenuAbiertoId(null)
  }

  // Confirma el borrado: mueve los eventos a la Papelera y cierra todo.
  const handleConfirmarEliminar = () => {
    if (calAEliminar) eliminarCalendario(calAEliminar.id)
    setCalAEliminar(null)
  }

  const dias = generarDiasMini()

  return (
    <div className="w-64 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col py-6 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 custom-scrollbar relative">

      {/* Botón Crear — SOLO admin. */}
      {puedeGestionar && (
        <div className="px-3 mb-6">
          <motion.button
            onClick={() => { onCrearEvento(); onCerrarMobile?.() }}
            whileTap={tap}
            className="inline-flex w-full items-center justify-center gap-2 px-5 min-h-[48px] rounded-[var(--radius-md)] bg-[var(--accent-color)] text-[var(--accent-contrast)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
          >
            <Plus size={20} />
            <span className="text-base">Crear</span>
          </motion.button>
        </div>
      )}

      {/* Mini calendario — oculto en celular (ocupa mucho; redundante ahí). */}
      <div className="hidden sm:block mb-6 px-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            {MESES[mesActual]} {anioActual}
          </span>
          <div className="flex items-center">
            <button
              onClick={onMesAnterior}
              aria-label="Mes anterior"
              className="inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onMesSiguiente}
              aria-label="Mes siguiente"
              className="inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DIAS_MINI.map((dia, i) => (
            <div key={i} className="text-center text-[11px] font-medium py-1 uppercase text-[var(--text-tertiary)] tracking-wide">{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {dias.map((dia, index) => {
            const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear()
            const tieneEventos = dia && diasConEventos.has(dia)
            return (
              <button
                key={index}
                onClick={() => dia && onDiaClick(dia)}
                disabled={!dia}
                aria-label={dia ? `${dia} de ${MESES[mesActual]}${tieneEventos ? ', con eventos' : ''}` : undefined}
                className={`relative aspect-square flex items-center justify-center text-[13px] font-medium rounded-full transition-colors duration-100
                  ${!dia ? 'cursor-default' : 'cursor-pointer hover:bg-[var(--hover-color)] focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]'}
                  ${esHoy
                    ? 'bg-[var(--accent-color)] text-[var(--accent-contrast)]'
                    : dia ? 'text-[var(--text-primary)]' : 'text-transparent'}`}
              >
                {dia || ''}
                {tieneEventos && !esHoy && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-color)]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sección Mis Calendarios */}
      <div className="flex flex-col gap-2 px-3">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Mis calendarios</span>
          {/* Añadir calendario — SOLO admin. */}
          {puedeGestionar && (
            <motion.button
              onClick={() => setMostrarForm(!mostrarForm)}
              whileTap={tapSoft}
              aria-label="Añadir calendario"
              aria-expanded={mostrarForm}
              className="inline-flex items-center justify-center h-10 w-10 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--accent-color)] hover:bg-[var(--hover-color)] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
            >
              <Plus size={20} />
            </motion.button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {puedeGestionar && mostrarForm && (
            <motion.div
              key="form-crear-calendario"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring}
              className="overflow-hidden"
            >
              <form onSubmit={handleCrearCalendario} className="flex flex-col gap-3 p-4 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)] shadow-[var(--shadow-md)]">
                <input
                  type="text"
                  placeholder="Nombre del calendario"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="linear-input text-sm"
                  autoFocus
                />
                <SelectorColor value={nuevoColor} onChange={setNuevoColor} size={24} />
                <div className="flex gap-2 justify-end mt-1">
                  <motion.button
                    type="button"
                    onClick={() => setMostrarForm(false)}
                    whileTap={tapSoft}
                    className="inline-flex items-center justify-center gap-2 px-4 min-h-[40px] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] rounded-[var(--radius-md)] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={tap}
                    className="inline-flex items-center justify-center gap-2 px-6 min-w-[100px] min-h-[40px] bg-[var(--accent-color)] text-[var(--accent-contrast)] rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
                  >
                    Crear
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="flex flex-col gap-0.5"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence initial={false}>
          {calendarios.map(cal => (
            <motion.div
              key={cal.id}
              layout
              variants={fadeUpItem}
              exit={{ opacity: 0, height: 0, marginTop: 0, transition: spring }}
              whileHover={{ backgroundColor: 'var(--hover-color)' }}
              className="dots-menu-container flex items-center gap-2 px-2 py-1 rounded-[var(--radius-md)] cursor-pointer group transition-colors relative"
              onClick={() => toggleCalendarioVisible(cal.id)}
              role="checkbox"
              aria-checked={cal.visible}
              aria-label={`Calendario ${cal.nombre}`}
            >
              {/* Checkbox de color claro: relleno = visible, contorno = oculto. */}
              <span
                className={`w-3.5 h-3.5 rounded-[4px] flex items-center justify-center transition-all flex-shrink-0 ${cal.visible ? '' : 'opacity-50'}`}
                style={{
                  backgroundColor: cal.visible ? cal.color : 'transparent',
                  boxShadow: `inset 0 0 0 2px ${cal.color}`
                }}
              >
                {cal.visible && <Check size={10} className="text-white" strokeWidth={3} />}
              </span>
              <span className={`text-sm font-medium transition-colors truncate flex-1 ${cal.visible ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                {cal.nombre}
              </span>

              <motion.button
                onClick={(e) => handleAbrirMenu(e, cal.id)}
                whileTap={tapSoft}
                aria-label={`Opciones de ${cal.nombre}`}
                aria-haspopup="menu"
                className={`relative z-10 inline-flex flex-shrink-0 items-center justify-center h-8 w-8 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] opacity-60 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)] ${menuAbiertoId === cal.id ? 'opacity-100' : ''}`}
              >
                <MoreVertical size={16} />
              </motion.button>

              {/* Menú contextual — fixed para evitar recortes por overflow.
                  El portal DEBE envolver a AnimatePresence (no al revés):
                  AnimatePresence no rastrea un createPortal crudo como hijo. */}
              {createPortal(
                <AnimatePresence>
                {menuAbiertoId === cal.id && (
                  <motion.div
                    role="menu"
                    variants={menuVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="fixed-menu fixed bg-[var(--bg-primary)] rounded-[var(--radius-lg)] z-[9999] w-60 p-1.5 border border-[var(--border-color)] shadow-[var(--shadow-lg)]"
                    style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px`, transformOrigin: menuPos.origin }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* "Ver solo este" es una preferencia de vista local: disponible para todos. */}
                    <button
                      role="menuitem"
                      onClick={(e) => { e.stopPropagation(); verSoloEsteCalendario(cal.id); setMenuAbiertoId(null) }}
                      className="w-full text-left px-4 min-h-[40px] rounded-[var(--radius-md)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover-color)] transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:bg-[var(--hover-color)]"
                    >
                      <Eye size={18} className="text-[var(--text-secondary)] flex-shrink-0" />
                      Ver solo este
                    </button>

                    {/* Colores y eliminar — SOLO admin. */}
                    {puedeGestionar && (
                      <>
                        <div className="px-4 py-3 border-t border-b border-[var(--border-color)] my-1">
                          <SelectorColor
                            value={cal.color}
                            onChange={(c) => cambiarColorCalendario(cal.id, c)}
                            size={20}
                          />
                        </div>

                        <motion.button
                          role="menuitem"
                          onClick={(e) => { e.stopPropagation(); handlePedirEliminar(cal) }}
                          whileTap={tapSoft}
                          className="w-full text-left px-4 min-h-[40px] rounded-[var(--radius-md)] text-sm font-medium text-[var(--danger-color)] hover:bg-[var(--danger-soft)] transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:bg-[var(--danger-soft)]"
                        >
                          <Trash2 size={18} className="flex-shrink-0" />
                          Eliminar calendario
                        </motion.button>
                      </>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>,
                document.body
              )}
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Diálogo de confirmación de borrado de calendario. */}
      <AnimatePresence>
        {calAEliminar && (() => {
          const nEventos = eventos.filter(e => e.calendarioId === calAEliminar.id).length
          return (
            <motion.div
              key="confirmar-eliminar-calendario"
              variants={scrimVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setCalAEliminar(null)}
            >
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="titulo-eliminar-cal"
                variants={popVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-6 flex flex-col gap-4 text-[var(--text-primary)]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[var(--danger-soft)] text-[var(--danger-color)]">
                    <AlertTriangle size={20} />
                  </span>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h2 id="titulo-eliminar-cal" className="text-sm font-semibold text-[var(--text-primary)]">
                      ¿Eliminar «{calAEliminar.nombre}»?
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Se moverán sus {nEventos} {nEventos === 1 ? 'evento' : 'eventos'} a la Papelera.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <motion.button
                    type="button"
                    onClick={() => setCalAEliminar(null)}
                    whileTap={tapSoft}
                    className="inline-flex items-center justify-center gap-2 px-4 min-h-[40px] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] rounded-[var(--radius-md)] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleConfirmarEliminar}
                    whileTap={tap}
                    autoFocus
                    className="inline-flex items-center justify-center gap-2 px-5 min-h-[48px] text-sm font-medium text-white bg-[var(--danger-color)] rounded-[var(--radius-md)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
                  >
                    <Trash2 size={18} />
                    Eliminar
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

    </div>
  )
}

export default Sidebar
