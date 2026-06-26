import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useCalendario } from '../context/CalendarioContext'
import { puedeEditar } from '../utils/permisos'
import { spring } from '../lib/motion'
import { Undo2, X } from 'lucide-react'
import HeaderCalendario from '../components/calendar/HeaderCalendario'
import Sidebar from '../components/calendar/Sidebar'
import GrillaCalendario from '../components/calendar/GrillaCalendario'
import ModalEvento from '../components/modals/ModalEvento'
import VisualizadorEvento from '../components/modals/VisualizadorEvento'
import PaginaPapelera from '../components/calendar/PaginaPapelera'

function CalendarioPantallaPrincipal() {
  const { rol } = useAuth()
  const { notificacionUndo, deshacerEliminacionCalendario, confirmarEliminacionDefinitiva } = useCalendario()
  const hoy = new Date()

  // Solo los admin pueden crear/editar. Los trabajadores son de SOLO LECTURA.
  const puedeGestionar = puedeEditar(rol)

  const [mesActual, setMesActual] = useState(hoy.getMonth())
  const [anioActual, setAnioActual] = useState(hoy.getFullYear())
  // En celular el panel arranca cerrado (se abre con el ☰ como cajón).
  const [sidebarVisible, setSidebarVisible] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth >= 640 : true)
  )
  const [vistaActual, setVistaActual] = useState('mes')
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy.getDate())
  const [modalVisible, setModalVisible] = useState(false)
  const [fechaParaNuevoEvento, setFechaParaNuevoEvento] = useState(null)

  const [eventoParaVer, setEventoParaVer] = useState(null)
  const [mostrarVisualizador, setMostrarVisualizador] = useState(false)
  const [eventoAEditar, setEventoAEditar] = useState(null)
  const [mostrarPapelera, setMostrarPapelera] = useState(false)

  // Helper robusto para formatear fecha local
  const formatYMD = (y, m, d) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const irMesAnterior = () => {
    if (mesActual === 0) { setMesActual(11); setAnioActual(anioActual - 1) }
    else setMesActual(mesActual - 1)
  }

  const irMesSiguiente = () => {
    if (mesActual === 11) { setMesActual(0); setAnioActual(anioActual + 1) }
    else setMesActual(mesActual + 1)
  }

  // Navegación del header: respeta la vista activa (día/semana/mes/año).
  const navegar = (dir) => {
    if (vistaActual === 'anio') { setAnioActual(anioActual + dir); return }
    if (vistaActual === 'mes') {
      if (dir < 0) irMesAnterior(); else irMesSiguiente()
      return
    }
    // día o semana → mover por días sobre la fecha seleccionada
    const paso = vistaActual === 'semana' ? 7 : 1
    const d = new Date(anioActual, mesActual, diaSeleccionado)
    d.setDate(d.getDate() + dir * paso)
    setAnioActual(d.getFullYear())
    setMesActual(d.getMonth())
    setDiaSeleccionado(d.getDate())
  }

  const irHoy = () => {
    setMesActual(hoy.getMonth())
    setAnioActual(hoy.getFullYear())
    setDiaSeleccionado(hoy.getDate())
  }

  // Click simple en un día → abre la vista Día de ESE día.
  // Doble click → crea un evento en ese día.
  const irAVistaDia = (dia, mes, anio) => {
    setDiaSeleccionado(dia); setMesActual(mes); setAnioActual(anio)
    setVistaActual('dia')
  }
  const crearEnDia = (dia, mes, anio) => {
    setDiaSeleccionado(dia); setMesActual(mes); setAnioActual(anio)
    if (!puedeGestionar) return
    setFechaParaNuevoEvento(formatYMD(anio, mes, dia))
    setEventoAEditar(null)
    setModalVisible(true)
  }
  // Un dblclick dispara también 2 onClick; discriminamos con un timer y un ref
  // que recuerda el último día tocado (para no confundir clicks en días distintos).
  const clickDiaRef = useRef({ timer: null, clave: null })
  const handleDiaClick = (dia, mes = mesActual, anio = anioActual) => {
    const r = clickDiaRef.current
    const clave = `${anio}-${mes}-${dia}`
    if (r.timer && r.clave === clave) {
      clearTimeout(r.timer); r.timer = null; r.clave = null
      crearEnDia(dia, mes, anio)
    } else {
      if (r.timer) clearTimeout(r.timer)
      r.clave = clave
      r.timer = setTimeout(() => {
        r.timer = null; r.clave = null
        irAVistaDia(dia, mes, anio)
      }, 220)
    }
  }

  const handleCrearEvento = () => {
    if (!puedeGestionar) return
    // En vista Día creamos en el día mostrado; en el resto, hoy.
    const base = vistaActual === 'dia'
      ? { y: anioActual, m: mesActual, d: diaSeleccionado }
      : (() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() } })()
    setFechaParaNuevoEvento(formatYMD(base.y, base.m, base.d))
    setEventoAEditar(null)
    setModalVisible(true)
  }

  const handleEventoClick = (evento) => {
    setEventoParaVer(evento)
    setMostrarVisualizador(true)
  }

  const handleEditarEvento = () => {
    if (!puedeGestionar) return
    setEventoAEditar(eventoParaVer)
    setMostrarVisualizador(false)
    setModalVisible(true)
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden font-sans bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      <HeaderCalendario
        mesActual={mesActual}
        anioActual={anioActual}
        onHoy={irHoy}
        onAnterior={() => navegar(-1)}
        onSiguiente={() => navegar(1)}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        vistaActual={vistaActual}
        onCambiarVista={setVistaActual}
        onEventoClick={handleEventoClick}
        onAbrirPapelera={() => setMostrarPapelera(true)}
      />
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {sidebarVisible && (
          <>
            {/* Backdrop: solo celular, cierra el cajón al tocar afuera. */}
            <div
              className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm sm:hidden"
              onClick={() => setSidebarVisible(false)}
              aria-hidden="true"
            />
            {/* En celular el panel es un cajón superpuesto; en sm+ es columna fija. */}
            <div className="fixed inset-y-0 left-0 z-[60] flex shadow-2xl sm:static sm:z-auto sm:shadow-none">
              <Sidebar
                mesActual={mesActual}
                anioActual={anioActual}
                onDiaClick={handleDiaClick}
                onCrearEvento={handleCrearEvento}
                onMesAnterior={irMesAnterior}
                onMesSiguiente={irMesSiguiente}
                onCerrarMobile={() => { if (window.innerWidth < 640) setSidebarVisible(false) }}
              />
            </div>
          </>
        )}
        <GrillaCalendario
          mesActual={mesActual}
          anioActual={anioActual}
          onDiaClick={handleDiaClick}
          vistaActual={vistaActual}
          diaSeleccionado={diaSeleccionado}
          onEventoClick={handleEventoClick}
        />
      </div>

      <AnimatePresence>
        {modalVisible && (
          <ModalEvento
            key="modal-evento"
            onClose={() => setModalVisible(false)}
            fechaSeleccionada={fechaParaNuevoEvento}
            eventoAEditar={eventoAEditar}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarVisualizador && (
          <VisualizadorEvento
            key="visualizador-evento"
            evento={eventoParaVer}
            onClose={() => setMostrarVisualizador(false)}
            onEdit={handleEditarEvento}
          />
        )}
      </AnimatePresence>

      {/* Papelera a pantalla completa (cubre la grilla, no es un modal centrado) */}
      <AnimatePresence>
        {mostrarPapelera && (
          <PaginaPapelera
            key="pagina-papelera"
            onClose={() => setMostrarPapelera(false)}
          />
        )}
      </AnimatePresence>

      {/* Notificación de Deshacer (Undo) — snackbar con tokens del sistema */}
      <AnimatePresence>
        {notificacionUndo && (
          <motion.div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-6 bg-[var(--bg-secondary)] text-[var(--text-primary)] pl-5 pr-3 py-3 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] flex items-center gap-6 z-[3000] border border-[var(--border-color)]"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
          >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[var(--danger-color)] flex-shrink-0" />
            <span className="text-sm font-medium tracking-tight truncate">
              Se eliminó &quot;{notificacionUndo.data.nombre}&quot;
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={deshacerEliminacionCalendario}
              className="flex items-center gap-2 h-11 px-4 bg-[var(--accent-color)] text-[var(--accent-contrast)] text-xs font-medium rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
            >
              <Undo2 size={15} />
              Deshacer
            </button>
            <button
              onClick={confirmarEliminacionDefinitiva}
              aria-label="Descartar notificación"
              className="flex items-center justify-center h-11 w-11 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CalendarioPantallaPrincipal
