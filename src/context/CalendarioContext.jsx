import { createContext, useContext, useState, useEffect } from 'react'
import { db } from '../services/firebase'
import { registrarLog } from '../services/logger'
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  writeBatch,
  getDocs
} from 'firebase/firestore'

const CalendarioContext = createContext()

export const useCalendario = () => {
  const context = useContext(CalendarioContext)
  if (!context) {
    throw new Error('useCalendario debe usarse dentro de un CalendarioProvider')
  }
  return context
}

export const CalendarioProvider = ({ children }) => {
  const [calendarios, setCalendarios] = useState(() => {
    const saved = localStorage.getItem('calendarios')
    return saved ? JSON.parse(saved) : [
      { id: '1', nombre: 'Mi Calendario', color: '#1a73e8', visible: true },
      { id: '2', nombre: 'Trabajo', color: '#d50000', visible: true },
      { id: '3', nombre: 'Personal', color: '#33b679', visible: true }
    ]
  })

  const [eventos, setEventos] = useState([])
  const [notificacionUndo, setNotificacionUndo] = useState(null)

  useEffect(() => {
    localStorage.setItem('calendarios', JSON.stringify(calendarios))
  }, [calendarios])

  useEffect(() => {
    const q = query(collection(db, 'eventos'))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventosData = []
      querySnapshot.forEach((doc) => {
        eventosData.push({ ...doc.data(), id: doc.id })
      })
      setEventos(eventosData)
    })

    return () => unsubscribe()
  }, [])

  const agregarCalendario = (nuevo) => {
    setCalendarios([...calendarios, { ...nuevo, id: Date.now().toString(), visible: true }])
  }

  const toggleCalendarioVisible = (id) => {
    setCalendarios(calendarios.map(c => 
      c.id === id ? { ...c, visible: !c.visible } : c
    ))
  }

  const verSoloEsteCalendario = (id) => {
    setCalendarios(calendarios.map(c => ({
      ...c,
      visible: c.id === id
    })))
  }

  const cambiarColorCalendario = (id, color) => {
    setCalendarios(calendarios.map(c => 
      c.id === id ? { ...c, color } : c
    ))
  }

  const eliminarCalendario = async (id) => {
    const calAEliminar = calendarios.find(c => c.id === id)
    const eventosAEliminar = eventos.filter(e => e.calendarioId === id)

    setNotificacionUndo({
      tipo: 'calendario',
      data: calAEliminar,
      eventos: eventosAEliminar
    })

    setCalendarios(calendarios.filter(c => c.id !== id))

    const batch = writeBatch(db)
    eventosAEliminar.forEach(ev => {
      batch.delete(doc(db, 'eventos', ev.id))
    })
    await batch.commit()
  }

  const deshacerEliminacionCalendario = async () => {
    if (!notificacionUndo || notificacionUndo.tipo !== 'calendario') return
    setCalendarios([...calendarios, notificacionUndo.data])
    const batch = writeBatch(db)
    notificacionUndo.eventos.forEach(ev => {
      const { id, ...data } = ev
      batch.set(doc(db, 'eventos', id), data)
    })
    await batch.commit()
    setNotificacionUndo(null)
  }

  const confirmarEliminacionDefinitiva = () => {
    setNotificacionUndo(null)
  }

  const agregarEvento = async (evento, usuarioEmail) => {
    try {
      let proximoNum = 1
      if (eventos.length > 0) {
        const numeros = eventos.map(e => e.numEvento || 0)
        proximoNum = Math.max(...numeros) + 1
      }

      const docRef = await addDoc(collection(db, 'eventos'), {
        ...evento,
        numEvento: proximoNum,
        creadoPor: usuarioEmail,
        fechaCreacion: new Date().toISOString()
      })
      
      await registrarLog('CREAR_EVENTO', {
        usuario: usuarioEmail,
        eventoId: docRef.id,
        numEvento: proximoNum,
        titulo: evento.titulo
      })
    } catch (error) {
      console.error("Error al agregar evento: ", error)
    }
  }

  const editarEvento = async (id, eventoActualizado, usuarioEmail) => {
    try {
      const eventoOriginal = eventos.find(e => e.id === id)
      const eventoRef = doc(db, 'eventos', id)
      await updateDoc(eventoRef, eventoActualizado)

      await registrarLog('EDITAR_EVENTO', {
        usuario: usuarioEmail,
        eventoId: id,
        numEvento: eventoOriginal?.numEvento || 'N/A',
        titulo: eventoActualizado.titulo
      })
    } catch (error) {
      console.error("Error al editar evento: ", error)
    }
  }

  const eliminarEvento = async (id, usuarioEmail) => {
    try {
      const eventoParaEliminar = eventos.find(e => e.id === id)
      const eventoRef = doc(db, 'eventos', id)
      await deleteDoc(eventoRef)

      await registrarLog('ELIMINAR_EVENTO', {
        usuario: usuarioEmail,
        eventoId: id,
        numEvento: eventoParaEliminar?.numEvento || 'N/A',
        titulo: eventoParaEliminar?.titulo || 'Desconocido'
      })
    } catch (error) {
      console.error("Error al eliminar evento: ", error)
    }
  }

  return (
    <CalendarioContext.Provider value={{
      calendarios,
      agregarEvento,
      editarEvento,
      eliminarEvento,
      agregarCalendario,
      toggleCalendarioVisible,
      verSoloEsteCalendario,
      cambiarColorCalendario,
      eliminarCalendario,
      notificacionUndo,
      deshacerEliminacionCalendario,
      confirmarEliminacionDefinitiva,
      eventos,
      registrarLog
    }}>
      {children}
    </CalendarioContext.Provider>
  )
}
