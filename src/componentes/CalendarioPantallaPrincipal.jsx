import { useState } from 'react'
import { useAuth } from '../contexto/AuthContext'
import HeaderCalendario from './HeaderCalendario'
import Sidebar from './Sidebar'
import GrillaCalendario from './GrillaCalendario'

function CalendarioPantallaPrincipal() {
  const { usuario, rol } = useAuth()
  const hoy = new Date()

  const [mesActual, setMesActual] = useState(hoy.getMonth())
  const [anioActual, setAnioActual] = useState(hoy.getFullYear())
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [vistaActual, setVistaActual] = useState('mes')
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy.getDate())

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
    setVistaActual('dia')
  }

  const handleCrearEvento = () => {
    console.log('Crear evento — próximo paso')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Google Sans, Roboto, sans-serif' }}>
      <HeaderCalendario
        mesActual={mesActual}
        anioActual={anioActual}
        onHoy={irHoy}
        onAnterior={irMesAnterior}
        onSiguiente={irMesSiguiente}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        vistaActual={vistaActual}
        onCambiarVista={setVistaActual}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
        />
      </div>
    </div>
  )
}

export default CalendarioPantallaPrincipal