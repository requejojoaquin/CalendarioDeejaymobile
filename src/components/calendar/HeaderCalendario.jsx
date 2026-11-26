import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCalendario } from '../../context/CalendarioContext'
import { useAuth } from '../../context/AuthContext'
import { puedeEditar } from '../../utils/permisos'
import {
  Settings, Search, Trash2, Palette, X, LogOut,
  ChevronLeft, ChevronRight, Menu, CalendarDays
} from 'lucide-react'
import {
  spring, menuVariants, staggerContainer, fadeUpItem, tap,
} from '../../lib/motion'
import ModalAspecto from '../modals/ModalAspecto'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const VISTAS = [
  { id: 'mes', label: 'Mes' },
  { id: 'semana', label: 'Semana' },
  { id: 'dia', label: 'Día' },
  { id: 'anio', label: 'Año' },
]

// Botón base con touch target accesible (>=44px) y foco visible.
const btnBase =
  'inline-flex items-center justify-center rounded-[var(--radius-md)] transition-colors ' +
  'focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)] ' +
  'text-[var(--text-primary)]'

function HeaderCalendario({ mesActual, anioActual, onHoy, onAnterior, onSiguiente, onToggleSidebar, vistaActual, onCambiarVista, onEventoClick, onAbrirPapelera }) {
  const { eventos, calendarios } = useCalendario()
  const { rol, logout } = useAuth()
  const esAdminUser = puedeEditar(rol)

  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showAspectoModal, setShowAspectoModal] = useState(false)

  const searchRef = useRef(null)
  const settingsRef = useRef(null)
  const inputRef = useRef(null)

  // Resultados de búsqueda derivados en render (sin efecto/estado extra).
  const filteredEventos = useMemo(() => {
    if (searchTerm.trim() === '') return []
    const term = searchTerm.toLowerCase()
    return eventos.filter(ev =>
      ev.titulo?.toLowerCase().includes(term) ||
      (ev.descripcion && ev.descripcion.toLowerCase().includes(term)) ||
      (ev.ubicacion && ev.ubicacion.toLowerCase().includes(term))
    )
  }, [searchTerm, eventos])

  // Cierra menús/sugerencias al hacer click afuera.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
        setSearchTerm('')
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Escape cierra sugerencias y el menú de ajustes.
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return
      setShowSuggestions(false)
      setShowSettingsMenu(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const handleSelectEvento = (evento) => {
    onEventoClick(evento)
    setShowSuggestions(false)
    setSearchTerm('')
  }

  // Cierra sesión vía AuthContext. Al poner usuario=null la app vuelve sola al Login.
  const handleLogout = async () => {
    setShowSettingsMenu(false)
    await logout()
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4 pl-3 pr-4 sm:pl-5 sm:pr-6 h-16 flex-shrink-0 relative border-b border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">

      <motion.button
        whileTap={tap}
        onClick={onToggleSidebar}
        aria-label="Mostrar u ocultar panel lateral"
        className={`${btnBase} h-11 w-11 hover:bg-[var(--hover-color)]`}
      >
        <Menu size={20} />
      </motion.button>
      <div className="flex items-center gap-5">
        <span className="hidden sm:flex items-center gap-2 text-[18px] font-semibold tracking-tight">
          <CalendarDays size={25} className="text-[var(--accent-color)]" />
          CalendarMobile
        </span>

        <motion.button
          whileTap={tap}
          onClick={onHoy}
          className={`${btnBase} hidden sm:inline-flex h-11 w-20 px-8 ml-1 sm:ml-1 border border-[var(--border-color)] text-sm font-medium bg-[var(--bg-primary)] hover:bg-[var(--hover-color)]`}
        >
          Hoy
        </motion.button>

        <div className="flex items-center">
          <motion.button
            whileTap={tap}
            onClick={onAnterior}
            aria-label="Mes anterior"
            className={`${btnBase} h-11 w-11 hover:bg-[var(--hover-color)]`}
          >
            <ChevronLeft size={20} />
          </motion.button>
          <motion.button
            whileTap={tap}
            onClick={onSiguiente}
            aria-label="Mes siguiente"
            className={`${btnBase} h-11 w-11 hover:bg-[var(--hover-color)]`}
          >
            <ChevronRight size={20} />
          </motion.button>
        </div>
      </div>

      <span className="text-xl font-semibold tracking-tight whitespace-nowrap min-w-0 truncate tabular-nums">
        {MESES[mesActual]} {anioActual}
      </span>

      <div className="flex-1 min-w-0" />

      {/* Buscador */}
      <div ref={searchRef} className="relative group hidden md:block">
        <div className="flex items-center gap-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--radius-md)] pl-3.5 pr-2 h-11 w-[240px] transition-all duration-200 group-focus-within:w-[320px] group-focus-within:border-[var(--accent-color)] group-focus-within:shadow-[var(--ring-accent)] group-focus-within:bg-[var(--bg-primary)]">
          <Search size={18} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none w-full text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
          />
          {searchTerm && (
            <motion.button
              whileTap={tap}
              onClick={() => { setSearchTerm(''); inputRef.current?.focus() }}
              aria-label="Limpiar búsqueda"
              className="grid place-items-center h-7 w-7 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] transition-colors flex-shrink-0"
            >
              <X size={15} />
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {showSuggestions && searchTerm && (
            <motion.div
              style={{ transformOrigin: 'top left' }}
              className="absolute top-13 mt-2 left-0 right-0 min-w-[320px] bg-[var(--bg-primary)] shadow-[var(--shadow-lg)] rounded-[var(--radius-lg)] z-[1200] max-h-[400px] overflow-y-auto custom-scrollbar border border-[var(--border-color)] py-1.5"
              variants={menuVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {filteredEventos.length === 0 ? (
                <div className="px-4 py-6 text-sm text-[var(--text-secondary)] text-center">
                  Sin resultados
                </div>
              ) : (
                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                  {filteredEventos.slice(0, 8).map(evento => {
                    const cal = calendarios.find(c => c.id === evento.calendarioId)
                    const fecha = evento.fechaInicio || evento.fecha
                    return (
                      <motion.button
                        key={evento.id}
                        variants={fadeUpItem}
                        onClick={() => handleSelectEvento(evento)}
                        className="w-full text-left px-4 py-2.5 cursor-pointer flex items-center gap-3 hover:bg-[var(--hover-color)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--hover-color)]"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: evento.color || cal?.color || 'var(--accent-color)' }}
                        />
                        <span className="flex flex-col min-w-0 gap-0.5">
                          <span className="text-sm font-medium truncate text-[var(--text-primary)]">{evento.titulo}</span>
                          {fecha && (
                            <span className="text-xs text-[var(--text-secondary)] tabular-nums">{fecha}</span>
                          )}
                        </span>
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selector de vista — segmented control accesible */}
      <div
        role="tablist"
        aria-label="Cambiar vista del calendario"
        className="hidden sm:flex items-center gap-1 p-1 h-11 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--radius-md)]"
      >
        {VISTAS.map(v => {
          const activo = vistaActual === v.id
          return (
            <motion.button
              key={v.id}
              role="tab"
              aria-selected={activo}
              whileTap={tap}
              onClick={() => onCambiarVista(v.id)}
              className={`relative h-full px-5 min-w-[76px] inline-flex items-center justify-center text-sm font-medium rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]
                ${activo
                  ? 'text-[var(--accent-contrast)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)]'}`}
            >
              {activo && (
                <motion.div
                  layoutId="vista-activa"
                  className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--accent-color)]"
                  transition={spring}
                />
              )}
              <span className="relative z-10">{v.label}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Selector de vista compacto para pantallas chicas */}
      <select
        value={vistaActual}
        onChange={(e) => onCambiarVista(e.target.value)}
        aria-label="Cambiar vista del calendario"
        className="sm:hidden h-11 px-3 border border-[var(--border-color)] rounded-[var(--radius-md)] text-sm font-medium cursor-pointer bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--ring-accent)]"
      >
        {VISTAS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>

      <div ref={settingsRef} className="relative">
        <motion.button
          whileTap={tap}
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          aria-label="Ajustes"
          aria-haspopup="menu"
          aria-expanded={showSettingsMenu}
          className={`${btnBase} h-11 w-11 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)]`}
        >
          <Settings size={20} />
        </motion.button>

        <AnimatePresence>
          {showSettingsMenu && (
            <motion.div
              role="menu"
              style={{ transformOrigin: 'top right' }}
              className="absolute top-13 mt-2 right-0 bg-[var(--bg-primary)] shadow-[var(--shadow-lg)] rounded-[var(--radius-lg)] z-[1500] w-56 py-2 flex flex-col border border-[var(--border-color)]"
              variants={menuVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col p-1.5 space-y-1">
                <motion.button
                  variants={fadeUpItem}
                  role="menuitem"
                  onClick={() => {
                    setShowAspectoModal(true)
                    setShowSettingsMenu(false)
                  }}
                  className="rounded-md px-4 min-h-[40px] text-sm font-medium flex items-center gap-3 hover:bg-[var(--hover-color)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--hover-color)] text-[var(--text-primary)]"
                >
                  <Palette size={18} className="text-[var(--accent-color)] flex-shrink-0" />
                  Aspecto
                </motion.button>

                {/* Papelera: SOLO admin. Los trabajadores no la ven. */}
                {esAdminUser && (
                  <motion.button
                    variants={fadeUpItem}
                    role="menuitem"
                    onClick={() => {
                      onAbrirPapelera()
                      setShowSettingsMenu(false)
                    }}
                    className="rounded-md px-4 min-h-[40px] text-sm font-medium flex items-center gap-3 hover:bg-[var(--hover-color)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--hover-color)] text-[var(--text-primary)]"
                  >
                    <Trash2 size={18} className="text-[var(--text-secondary)] flex-shrink-0" />
                    Papelera
                  </motion.button>
                )}

                {/* Acción destructiva: separada del resto (patrón destructive-nav-separation). */}
                <motion.button
                  variants={fadeUpItem}
                  role="menuitem"
                  onClick={handleLogout}
                  className="mt-1.5 px-4 min-h-[40px] rounded-md text-sm font-medium flex items-center gap-3 border-t border-[var(--border-color)] hover:bg-[var(--danger-soft)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--danger-soft)] text-[var(--danger-color)]"
                >
                  <LogOut size={18} className="text-[var(--danger-color)] flex-shrink-0" />
                  Cerrar sesión
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAspectoModal && (
          <ModalAspecto onClose={() => setShowAspectoModal(false)} />
        )}
      </AnimatePresence>

    </div>
  )
}

export default HeaderCalendario
