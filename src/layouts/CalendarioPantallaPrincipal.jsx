import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCalendario } from '../context/CalendarioContext'
import { useModoOscuro } from '../context/ModoOscuroContext'
import HeaderCalendario from '../components/calendar/HeaderCalendario'
import Sidebar from '../components/calendar/Sidebar'
import GrillaCalendario from '../components/calendar/GrillaCalendario'
import ModalEvento from '../components/modals/ModalEvento'
import VisualizadorEvento from '../components/modals/VisualizadorEvento'

function CalendarioPantallaPrincipal() {
  const { usuario, rol } = useAuth()
  const { notificacionUndo, deshacerEliminacionCalendario, confirmarEliminacionDefinitiva } = useCalendario()
  const { esOscuro } = useModoOscuro()
  const hoy = new Date()

  const [mesActual, setMesActual] = useState(hoy.getMonth())
  const [anioActual, setAnioActual] = useState(hoy.getFullYear())
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [vistaActual, setVistaActual] = useState('mes')
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy.getDate())
  const [modalVisible, setModalVisible] = useState(false)
  const [fechaParaNuevoEvento, setFechaParaNuevoEvento] = useState(null)
  
  const [eventoParaVer, setEventoParaVer] = useState(null)
  const [mostrarVisualizador, setMostrarVisualizador] = useState(false)
  const [eventoAEditar, setEventoAEditar] = useState(null)

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

  const irHoy = () => {
    setMesActual(hoy.getMonth())
    setAnioActual(hoy.getFullYear())
    setDiaSeleccionado(hoy.getDate())
  }

  const handleDiaClick = (dia) => {
    setDiaSeleccionado(dia)
    setFechaParaNuevoEvento(formatYMD(anioActual, mesActual, dia))
    setEventoAEditar(null)
    setModalVisible(true)
  }

  const handleCrearEvento = () => {
    const d = new Date()
    setFechaParaNuevoEvento(formatYMD(d.getFullYear(), d.getMonth(), d.getDate()))
    setEventoAEditar(null)
    setModalVisible(true)
  }

  const handleEventoClick = (evento) => {
    setEventoParaVer(evento)
    setMostrarVisualizador(true)
  }

  const handleEditarEvento = () => {
    setEventoAEditar(eventoParaVer)
    setMostrarVisualizador(false)
    setModalVisible(true)
  }

  return (
    <div className="flex flex-col h-screen font-sans bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      <HeaderCalendario
        mesActual={mesActual}
        anioActual={anioActual}
        onHoy={irHoy}
        onAnterior={irMesAnterior}
        onSiguiente={irMesSiguiente}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        vistaActual={vistaActual}
        onCambiarVista={setVistaActual}
        onEventoClick={handleEventoClick}
      />
      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && (
          <Sidebar
            mesActual={mesActual}
            anioActual={anioActual}
            onDiaClick={handleDiaClick}
            onCrearEvento={handleCrearEvento}
            onMesAnterior={irMesAnterior}
            onMesSiguiente={irMesSiguiente}
          />
        )}
        <GrillaCalendario
          mesActual={mesActual}
          anioActual={anioActual}
          onDiaClick={handleDiaClick}
          vistaActual={vistaActual}
          onCambiarVista={setVistaActual}
          diaSeleccionado={diaSeleccionado}
          onEventoClick={handleEventoClick}
        />
      </div>

      {modalVisible && (
        <ModalEvento 
          onClose={() => setModalVisible(false)} 
          fechaSeleccionada={fechaParaNuevoEvento}
          eventoAEditar={eventoAEditar}
        />
      )}

      {mostrarVisualizador && (
        <VisualizadorEvento
          evento={eventoParaVer}
          onClose={() => setMostrarVisualizador(false)}
          onEdit={handleEditarEvento}
        />
      )}

      {/* Notificación de Deshacer (Undo) Estilo Linear */}
      {notificacionUndo && (
        <div className="fixed bottom-8 left-8 bg-[var(--bg-secondary)] text-[var(--text-primary)] px-6 py-3 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-8 z-[3000] border border-[var(--border-color)] animate-zoom-in backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm font-semibold tracking-tight">
              Se eliminó "{notificacionUndo.data.nombre}"
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={deshacerEliminacionCalendario}
              className="px-4 py-1.5 bg-[var(--accent-color)] text-white text-xs font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-all shadow-md active:scale-95"
            >
              Deshacer
            </button>
            <button 
              onClick={confirmarEliminacionDefinitiva}
              className="px-4 py-1.5 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold rounded-lg transition-all"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarioPantallaPrincipal
