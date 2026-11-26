import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { db } from '../services/firebase'
import { registrarLog } from '../services/logger'
import { useAuth } from './AuthContext'
import { esAdmin, puedeVerPresupuesto } from '../utils/permisos'
import { validarEvento } from '../utils/validacion'
import {
  collection,
  addDoc,
  setDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch
} from 'firebase/firestore'

const CalendarioContext = createContext()

// Clave de localStorage donde se guarda la visibilidad por-usuario de cada calendario.
const CLAVE_VISIBLES = 'calendariosVisibles'

// Marca de que los calendarios default ya se sembraron una vez. Evita que
// reaparezcan tras borrarlos y que se dupliquen en cada recarga.
const CLAVE_SEMBRADO = 'cal_default_sembrado'

// URL del backend de invitaciones (con fallback a localhost para desarrollo).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Calendarios sembrados la primera vez que un admin entra con la colección vacía.
const CALENDARIOS_DEFAULT = [
  { nombre: 'Mi Calendario', color: '#1a73e8' },
  { nombre: 'Trabajo', color: '#d50000' },
  { nombre: 'Personal', color: '#33b679' }
]

export const useCalendario = () => {
  const context = useContext(CalendarioContext)
  if (!context) {
    throw new Error('useCalendario debe usarse dentro de un CalendarioProvider')
  }
  return context
}

// Lee el mapa {id: bool} de visibilidad desde localStorage.
const leerVisiblesGuardados = () => {
  try {
    const saved = localStorage.getItem(CLAVE_VISIBLES)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export const CalendarioProvider = ({ children }) => {
  const { usuario, rol } = useAuth()

  // Calendarios tal cual vienen de Firestore (sin la propiedad `visible`).
  const [calendariosRaw, setCalendariosRaw] = useState([])
  // True una vez que Firestore entregó la primera lectura REAL. Evita sembrar
  // durante el vacío inicial (la causa de la duplicación al recargar).
  const [calendariosCargados, setCalendariosCargados] = useState(false)
  // Mapa {id: bool} de visibilidad, preferencia por-usuario (localStorage).
  const [visibles, setVisibles] = useState(() => leerVisiblesGuardados())

  // Todos los eventos crudos (activos + papelera). Se separan al exponerlos.
  const [eventosRaw, setEventosRaw] = useState([])

  // Mapa {eventoId: info} de presupuestos. Solo se llena para admins.
  const [presupuestos, setPresupuestos] = useState({})

  // Estado del sistema de undo para borrado de calendarios.
  const [notificacionUndo, setNotificacionUndo] = useState(null)

  // Guard para no volver a sembrar los calendarios default más de una vez.
  const sembradoRef = useRef(false)

  // --- Persistencia de la visibilidad en localStorage ---
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_VISIBLES, JSON.stringify(visibles))
    } catch {
      // Si localStorage no está disponible simplemente no persistimos.
    }
  }, [visibles])

  // --- Suscripción a la colección de calendarios (solo con sesión activa) ---
  useEffect(() => {
    if (!usuario) { setCalendariosRaw([]); setCalendariosCargados(false); return }
    const unsubscribe = onSnapshot(
      collection(db, 'calendarios'),
      (snapshot) => {
        const data = []
        snapshot.forEach((d) => {
          data.push({ ...d.data(), id: d.id })
        })
        setCalendariosRaw(data)
        setCalendariosCargados(true)
      },
      (error) => console.error('Error en suscripción de calendarios:', error.code)
    )
    return () => unsubscribe()
  }, [usuario])

  // --- Sembrado de calendarios default (solo admin, UNA sola vez en la vida) ---
  useEffect(() => {
    if (!esAdmin(rol)) return
    if (sembradoRef.current) return
    // Clave: esperar la lectura REAL de Firestore (no el vacío inicial).
    if (!calendariosCargados) return
    // Si ya se sembró alguna vez, nunca más (así los borrados no reaparecen).
    if (localStorage.getItem(CLAVE_SEMBRADO)) { sembradoRef.current = true; return }
    sembradoRef.current = true
    try { localStorage.setItem(CLAVE_SEMBRADO, '1') } catch { /* ignore */ }
    // Solo sembramos si la colección está REALMENTE vacía tras la lectura.
    if (calendariosRaw.length > 0) return
    CALENDARIOS_DEFAULT.forEach(async (cal) => {
      try {
        await addDoc(collection(db, 'calendarios'), cal)
      } catch (error) {
        console.error('Error al sembrar calendario default:', error)
      }
    })
  }, [rol, calendariosRaw, calendariosCargados])

  // --- Suscripción a la colección de eventos (solo con sesión activa) ---
  useEffect(() => {
    if (!usuario) { setEventosRaw([]); return }
    const unsubscribe = onSnapshot(
      collection(db, 'eventos'),
      (snapshot) => {
        const data = []
        snapshot.forEach((d) => {
          data.push({ ...d.data(), id: d.id })
        })
        setEventosRaw(data)
      },
      (error) => console.error('Error en suscripción de eventos:', error.code)
    )
    return () => unsubscribe()
  }, [usuario])

  // --- Suscripción a presupuestos: SOLO si el rol puede verlos ---
  // Si el usuario no puede ver presupuestos NO nos suscribimos (evita errores
  // de permisos en Firestore). El mapa expuesto se gatea además por rol al
  // leerlo, así un cambio de rol en la misma sesión nunca filtra datos viejos.
  useEffect(() => {
    if (!usuario || !puedeVerPresupuesto(rol)) { setPresupuestos({}); return }
    const unsubscribe = onSnapshot(
      collection(db, 'presupuestos'),
      (snapshot) => {
        const mapa = {}
        snapshot.forEach((d) => {
          const data = d.data()
          mapa[data?.eventoId || d.id] = data?.info
        })
        setPresupuestos(mapa)
      },
      (error) => console.error('Error en suscripción de presupuestos:', error.code)
    )
    return () => unsubscribe()
  }, [rol, usuario])

  // Mapa de presupuestos efectivo: vacío si el rol no puede verlos.
  // useMemo para que `getPresupuesto` mantenga identidad estable entre renders.
  const presupuestosVisibles = useMemo(
    () => (puedeVerPresupuesto(rol) ? presupuestos : {}),
    [rol, presupuestos]
  )

  // Privacidad por dueño (client-side, "visual"): un calendario privado solo lo
  // ve su propietario (uid); los públicos los ven todos. La seguridad REAL a
  // nivel de reglas/API se hará más adelante (deploy); esto oculta en la app.
  const uid = usuario?.uid || null
  const puedeVerCalendario = (c) => c.privado !== true || c.propietario === uid

  // Un evento se oculta si pertenece a un calendario privado ajeno. Un evento
  // sin calendario conocido no se oculta (no rompemos legacy/huérfanos).
  const calById = new Map(calendariosRaw.map((c) => [c.id, c]))
  const eventoVisiblePorPrivacidad = (e) => {
    const c = calById.get(e.calendarioId)
    return !c || puedeVerCalendario(c)
  }

  // Calendarios expuestos: solo los visibles para este usuario, mergeados con la
  // visibilidad local (mostrar/ocultar en la grilla, eje distinto a privacidad).
  const calendarios = calendariosRaw
    .filter(puedeVerCalendario)
    .map((c) => ({
      ...c,
      visible: visibles[c.id] !== undefined ? visibles[c.id] : true
    }))

  // Eventos activos (incluye los legacy sin `estado`). Oculta los de calendarios
  // privados ajenos.
  const eventos = eventosRaw.filter(
    (e) => e.estado !== 'papelera' && eventoVisiblePorPrivacidad(e)
  )
  // Eventos en papelera (también respetan la privacidad del calendario).
  const eventosPapelera = eventosRaw.filter(
    (e) => e.estado === 'papelera' && eventoVisiblePorPrivacidad(e)
  )

  // ==========================================================================
  // CALENDARIOS
  // ==========================================================================

  const agregarCalendario = useCallback(async ({ nombre, color, privado = false }) => {
    if (!esAdmin(rol)) return
    try {
      await addDoc(collection(db, 'calendarios'), {
        nombre,
        color,
        // Privacidad por dueño: si es privado, guardamos quién lo posee (uid).
        privado: !!privado,
        propietario: usuario?.uid || null
      })
    } catch (error) {
      console.error('Error al agregar calendario:', error)
    }
  }, [rol, usuario])

  const cambiarColorCalendario = useCallback(async (id, color) => {
    if (!esAdmin(rol)) return
    try {
      await updateDoc(doc(db, 'calendarios', id), { color })
    } catch (error) {
      console.error('Error al cambiar color del calendario:', error)
    }
  }, [rol])

  // Cambia la privacidad de un calendario. Al hacerlo privado, su propietario
  // pasa a ser el admin actual (uid): solo él lo verá. Al hacerlo público vuelve
  // a ser visible para todos. Solo admin. (Enforcement real = futuras reglas.)
  const cambiarPrivacidadCalendario = useCallback(async (id, privado) => {
    if (!esAdmin(rol)) return
    try {
      await updateDoc(doc(db, 'calendarios', id), {
        privado: !!privado,
        propietario: usuario?.uid || null
      })
    } catch (error) {
      console.error('Error al cambiar privacidad del calendario:', error)
    }
  }, [rol, usuario])

  // Alterna la visibilidad de un calendario (solo localStorage + estado local).
  const toggleCalendarioVisible = useCallback((id) => {
    setVisibles((prev) => {
      const actual = prev[id] !== undefined ? prev[id] : true
      return { ...prev, [id]: !actual }
    })
  }, [])

  // Deja visible solo el calendario indicado, oculta el resto (solo local).
  const verSoloEsteCalendario = useCallback((id) => {
    setVisibles(() => {
      const mapa = {}
      calendariosRaw.forEach((c) => {
        mapa[c.id] = c.id === id
      })
      return mapa
    })
  }, [calendariosRaw])

  // Elimina un calendario: guarda snapshot para undo, borra el doc del
  // calendario y manda a papelera (estado:'papelera') los eventos asociados.
  const eliminarCalendario = useCallback(async (id) => {
    if (!esAdmin(rol)) return
    const calAEliminar = calendariosRaw.find((c) => c.id === id)
    if (!calAEliminar) return
    const eventosAfectados = eventosRaw.filter((e) => e.calendarioId === id)

    // Guardamos el snapshot para poder deshacer.
    setNotificacionUndo({
      tipo: 'calendario',
      data: calAEliminar,
      // Guardamos el estado previo de cada evento afectado para restaurarlo.
      eventos: eventosAfectados.map((e) => ({
        id: e.id,
        estadoPrevio: e.estado || 'activo'
      }))
    })

    try {
      await deleteDoc(doc(db, 'calendarios', id))
      // Mandamos sus eventos a la papelera (borrado suave).
      const batch = writeBatch(db)
      eventosAfectados.forEach((ev) => {
        batch.update(doc(db, 'eventos', ev.id), {
          estado: 'papelera',
          deletedAt: new Date().toISOString(),
          deletedBy: usuario?.email || null
        })
      })
      await batch.commit()

      await registrarLog('ELIMINAR_CALENDARIO', {
        usuario: usuario?.email,
        calendarioId: id,
        nombre: calAEliminar.nombre
      })
    } catch (error) {
      console.error('Error al eliminar calendario:', error)
    }
  }, [rol, calendariosRaw, eventosRaw, usuario])

  // Deshace la última eliminación de calendario: recrea el calendario y
  // restaura el estado previo de sus eventos.
  const deshacerEliminacionCalendario = useCallback(async () => {
    if (!notificacionUndo || notificacionUndo.tipo !== 'calendario') return
    const { data, eventos: eventosGuardados } = notificacionUndo
    try {
      // Recreamos el calendario con su mismo id.
      await setDoc(doc(db, 'calendarios', data.id), {
        nombre: data.nombre,
        color: data.color,
        // Preservamos la privacidad al restaurar (data es el snapshot del cal).
        privado: data.privado ?? false,
        propietario: data.propietario ?? null
      })
      // Restauramos el estado previo de los eventos afectados.
      const batch = writeBatch(db)
      eventosGuardados.forEach((ev) => {
        batch.update(doc(db, 'eventos', ev.id), {
          estado: ev.estadoPrevio,
          deletedAt: deleteField(),
          deletedBy: deleteField()
        })
      })
      await batch.commit()
    } catch (error) {
      console.error('Error al deshacer eliminación de calendario:', error)
    } finally {
      setNotificacionUndo(null)
    }
  }, [notificacionUndo])

  // Confirma la eliminación: ya no se puede deshacer (los eventos quedan en
  // papelera y el calendario borrado). Solo cierra la notificación.
  const confirmarEliminacionDefinitiva = useCallback(() => {
    setNotificacionUndo(null)
  }, [])

  // ==========================================================================
  // INVITACIONES
  // ==========================================================================

  // Envía invitaciones por email vía el backend Express.
  // No lanza ante errores: solo loguea (un fallo de email no debe romper nada).
  // Se declara antes que `agregarEvento` porque este la utiliza.
  const enviarInvitaciones = useCallback(async (evento, invitados, organizador, presupuesto) => {
    try {
      const res = await fetch(`${API_URL}/api/enviar-invitacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evento, invitados, organizador, presupuesto })
      })

      if (res.status === 503) {
        console.info('Email no configurado aún')
        return
      }
      if (!res.ok) {
        console.error('Error al enviar invitaciones, status:', res.status)
        return
      }
      return await res.json()
    } catch (error) {
      console.error('Error de red al enviar invitaciones:', error)
    }
  }, [])

  // ==========================================================================
  // EVENTOS
  // ==========================================================================

  // Calcula el próximo número correlativo de evento.
  const calcularProximoNum = useCallback(() => {
    if (eventosRaw.length === 0) return 1
    const numeros = eventosRaw.map((e) => e.numEvento || 0)
    return Math.max(...numeros) + 1
  }, [eventosRaw])

  // Crea un evento. Tolera args extra (llamadores viejos pasan el email).
  const agregarEvento = useCallback(async (datos) => {
    // Validación: si no es válido, lanzamos para que el modal muestre el error.
    const { valido, errores } = validarEvento(datos)
    if (!valido) {
      const primerError = Array.isArray(errores)
        ? errores[0]
        : (errores && Object.values(errores)[0])
      throw new Error(primerError || 'Datos del evento inválidos')
    }

    // Separamos el presupuesto (`precio`) y el flag de UI `incluirPresupuesto`
    // del resto: NINGUNO va en el doc del evento.
    const { precio, incluirPresupuesto, ...datosSinPrecio } = datos
    const proximoNum = calcularProximoNum()

    try {
      const docRef = await addDoc(collection(db, 'eventos'), {
        ...datosSinPrecio,
        estado: 'activo',
        numEvento: proximoNum,
        creadoPor: usuario?.email || null,
        fechaCreacion: new Date().toISOString()
      })

      // El presupuesto va en su colección aparte, y solo si el rol puede verlo.
      if (puedeVerPresupuesto(rol) && precio !== undefined && precio !== '' && precio !== null) {
        await setDoc(doc(db, 'presupuestos', docRef.id), {
          info: precio,
          eventoId: docRef.id,
          actualizadoPor: usuario?.email || null,
          fecha: new Date().toISOString()
        })
      }

      await registrarLog('CREAR_EVENTO', {
        usuario: usuario?.email,
        eventoId: docRef.id,
        numEvento: proximoNum,
        titulo: datos.titulo
      })

      // Invitaciones por email (si las hay). Un fallo NO rompe la creación.
      if (datos.invitados?.length) {
        try {
          // El presupuesto solo viaja si el organizador lo marcó Y su rol puede verlo.
          // Pasamos `datosSinPrecio` para que `precio` NUNCA salga en el objeto evento.
          const presupuestoParaMail =
            incluirPresupuesto && puedeVerPresupuesto(rol) ? precio : undefined
          await enviarInvitaciones(datosSinPrecio, datos.invitados, usuario?.email, presupuestoParaMail)
        } catch (error) {
          console.error('Error al enviar invitaciones:', error)
        }
      }

      return docRef.id
    } catch (error) {
      console.error('Error al agregar evento:', error)
      throw error
    }
  }, [rol, usuario, calcularProximoNum, enviarInvitaciones])

  // Edita un evento. Tolera args extra (llamadores viejos pasan el email).
  const editarEvento = useCallback(async (id, datos) => {
    const { precio, ...datosSinPrecio } = datos
    // `incluirPresupuesto` es un flag de UI (solo aplica al enviar invitaciones
    // al crear); nunca debe persistirse en el doc del evento.
    delete datosSinPrecio.incluirPresupuesto
    const eventoOriginal = eventosRaw.find((e) => e.id === id)
    try {
      await updateDoc(doc(db, 'eventos', id), datosSinPrecio)

      // El presupuesto solo lo toca quien puede verlo (admin).
      if (puedeVerPresupuesto(rol)) {
        if (precio !== undefined && precio !== '' && precio !== null) {
          await setDoc(doc(db, 'presupuestos', id), {
            info: precio,
            eventoId: id,
            actualizadoPor: usuario?.email || null,
            fecha: new Date().toISOString()
          })
        } else if (precio === '' || precio === null) {
          // Presupuesto vaciado explícitamente: borramos el doc si existía.
          try {
            await deleteDoc(doc(db, 'presupuestos', id))
          } catch {
            // Si no existía, lo ignoramos.
          }
        }
      }

      await registrarLog('EDITAR_EVENTO', {
        usuario: usuario?.email,
        eventoId: id,
        numEvento: eventoOriginal?.numEvento || 'N/A',
        titulo: datos.titulo
      })
    } catch (error) {
      console.error('Error al editar evento:', error)
      throw error
    }
  }, [rol, usuario, eventosRaw])

  // Borrado SUAVE: manda el evento a la papelera. Tolera args extra.
  const eliminarEvento = useCallback(async (id) => {
    const evento = eventosRaw.find((e) => e.id === id)
    try {
      await updateDoc(doc(db, 'eventos', id), {
        estado: 'papelera',
        deletedAt: new Date().toISOString(),
        deletedBy: usuario?.email || null
      })

      await registrarLog('ELIMINAR_EVENTO', {
        usuario: usuario?.email,
        eventoId: id,
        numEvento: evento?.numEvento || 'N/A',
        titulo: evento?.titulo || 'Desconocido'
      })
    } catch (error) {
      console.error('Error al eliminar evento:', error)
    }
  }, [eventosRaw, usuario])

  // Restaura un evento desde la papelera.
  const restaurarEvento = useCallback(async (id) => {
    const evento = eventosRaw.find((e) => e.id === id)
    try {
      await updateDoc(doc(db, 'eventos', id), {
        estado: 'activo',
        deletedAt: deleteField(),
        deletedBy: deleteField()
      })

      await registrarLog('RESTAURAR_EVENTO', {
        usuario: usuario?.email,
        eventoId: id,
        numEvento: evento?.numEvento || 'N/A',
        titulo: evento?.titulo || 'Desconocido'
      })
    } catch (error) {
      console.error('Error al restaurar evento:', error)
    }
  }, [eventosRaw, usuario])

  // Borrado DURO: elimina el evento y su presupuesto.
  const eliminarDefinitivo = useCallback(async (id) => {
    const evento = eventosRaw.find((e) => e.id === id)
    try {
      await deleteDoc(doc(db, 'eventos', id))
      try {
        await deleteDoc(doc(db, 'presupuestos', id))
      } catch {
        // Si no había presupuesto, lo ignoramos.
      }

      await registrarLog('ELIMINAR_DEFINITIVO', {
        usuario: usuario?.email,
        eventoId: id,
        numEvento: evento?.numEvento || 'N/A',
        titulo: evento?.titulo || 'Desconocido'
      })
    } catch (error) {
      console.error('Error al eliminar definitivamente el evento:', error)
    }
  }, [eventosRaw, usuario])

  // Vacía la papelera: borra todos los eventos en papelera y sus presupuestos.
  const vaciarPapelera = useCallback(async () => {
    const enPapelera = eventosRaw.filter((e) => e.estado === 'papelera')
    if (enPapelera.length === 0) return
    try {
      const batch = writeBatch(db)
      enPapelera.forEach((ev) => {
        batch.delete(doc(db, 'eventos', ev.id))
        batch.delete(doc(db, 'presupuestos', ev.id))
      })
      await batch.commit()

      await registrarLog('VACIAR_PAPELERA', {
        usuario: usuario?.email,
        cantidad: enPapelera.length
      })
    } catch (error) {
      console.error('Error al vaciar la papelera:', error)
    }
  }, [eventosRaw, usuario])

  // ==========================================================================
  // PRESUPUESTOS
  // ==========================================================================

  // Devuelve el presupuesto (string) de un evento, o undefined.
  const getPresupuesto = useCallback((eventoId) => {
    return presupuestosVisibles[eventoId]
  }, [presupuestosVisibles])

  // Guarda/actualiza el presupuesto de un evento (solo admin).
  const guardarPresupuesto = useCallback(async (eventoId, info) => {
    if (!puedeVerPresupuesto(rol)) return
    try {
      await setDoc(doc(db, 'presupuestos', eventoId), {
        info,
        eventoId,
        actualizadoPor: usuario?.email || null,
        fecha: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error al guardar presupuesto:', error)
    }
  }, [rol, usuario])

  return (
    <CalendarioContext.Provider value={{
      // --- Datos ---
      calendarios,
      eventos,
      eventosPapelera,
      // --- Eventos ---
      agregarEvento,
      editarEvento,
      eliminarEvento,
      restaurarEvento,
      eliminarDefinitivo,
      vaciarPapelera,
      // --- Calendarios ---
      agregarCalendario,
      cambiarColorCalendario,
      cambiarPrivacidadCalendario,
      toggleCalendarioVisible,
      verSoloEsteCalendario,
      eliminarCalendario,
      // --- Presupuestos ---
      getPresupuesto,
      guardarPresupuesto,
      // --- Invitaciones ---
      enviarInvitaciones,
      // --- Undo de calendarios ---
      notificacionUndo,
      deshacerEliminacionCalendario,
      confirmarEliminacionDefinitiva,
      // --- Utilidad ---
      registrarLog
    }}>
      {children}
    </CalendarioContext.Provider>
  )
}
