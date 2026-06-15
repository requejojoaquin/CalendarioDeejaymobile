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

      {/* Notificación de Deshacer (Undo) */}
      {notificacionUndo && (
        <div className="fixed bottom-6 left-6 bg-[#323232] text-white px-6 py-2 rounded shadow-2xl flex items-center gap-6 z-[3000] border border-gray-700 animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm">
            Se eliminó el calendario "{notificacionUndo.data.nombre}"
          </span>
          <div className="flex">
            <button 
              onClick={deshacerEliminacionCalendario}
              className="bg-none border-none text-[#8ab4f8] cursor-pointer text-sm font-medium px-2 py-2 hover:bg-white/5 rounded uppercase"
            >
              Descartar
            </button>
            <button 
              onClick={confirmarEliminacionDefinitiva}
              className="bg-none border-none text-white cursor-pointer text-sm font-medium px-2 py-2 hover:bg-white/5 rounded uppercase"
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
