import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useCalendario } from '../../context/CalendarioContext'
import { useAuth } from '../../context/AuthContext'
import { esAdmin } from '../../utils/permisos'
import { validarEvento, sanitizarTexto, LIMITES } from '../../utils/validacion'
import { db } from '../../services/firebase'
import { collection, query, getDocs, where, limit } from 'firebase/firestore'
import { scrimVariants, popVariants, staggerContainer, fadeUpItem, menuVariants, tap } from '../../lib/motion'
import { TIPOS_RECURRENCIA, UNIDADES_RECURRENCIA } from '../../utils/recurrencia'
import SelectorColor from '../common/SelectorColor'
import {
  Clock,
  MapPin,
  AlignLeft,
  Banknote,
  Users,
  Check,
  Calendar,
  Plus,
  Repeat,
  ChevronDown,
  X,
  Pipette,
  AlertTriangle,
} from 'lucide-react'

// URL del backend (con fallback a localhost para desarrollo).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Mismo criterio de formato que el backend (server/index.js REGEX_EMAIL).
const REGEX_EMAIL_CLIENTE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Historial de emails invitados a mano (no necesariamente usuarios
// registrados en la app). Vive en localStorage: es un atajo personal del
// admin que los tipeó, no datos de terceros compilados de otra fuente.
const HISTORIAL_INVITADOS_KEY = 'mi-calendario:historial-invitados'

function leerHistorialInvitados() {
  try {
    const raw = localStorage.getItem(HISTORIAL_INVITADOS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function guardarEnHistorialInvitados(email) {
  try {
    const limpio = email.trim().toLowerCase()
    if (!limpio) return
    const actual = leerHistorialInvitados()
    if (actual.includes(limpio)) return
    localStorage.setItem(HISTORIAL_INVITADOS_KEY, JSON.stringify([limpio, ...actual].slice(0, 50)))
  } catch {
    // localStorage puede fallar (modo privado / cuota llena): no es crítico.
  }
}

function ModalEvento({ onClose, fechaSeleccionada, eventoAEditar }) {
  const { calendarios, agregarEvento, editarEvento, getPresupuesto } = useCalendario()
  const { rol } = useAuth()
  const isAdmin = esAdmin(rol)
  // Defensa por rol: si no es admin nunca debería abrirse en modo edición,
  // pero por las dudas mostramos todo en modo lectura y ocultamos Guardar.
  const soloLectura = !isAdmin

  // Popover de paleta de color del evento (cierra al click afuera / Escape).
  const [paletaColorAbierta, setPaletaColorAbierta] = useState(false)
  const colorRef = useRef(null)
  useEffect(() => {
    if (!paletaColorAbierta) return
    const onDown = (e) => { if (colorRef.current && !colorRef.current.contains(e.target)) setPaletaColorAbierta(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setPaletaColorAbierta(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc) }
  }, [paletaColorAbierta])

  const [titulo, setTitulo] = useState(eventoAEditar?.titulo || '')
  const [descripcion, setDescripcion] = useState(eventoAEditar?.descripcion || '')
  // El presupuesto ya NO vive en el doc del evento: se lee del contexto.
  const [precio, setPrecio] = useState(
    eventoAEditar ? getPresupuesto(eventoAEditar.id) || '' : ''
  )
  // Si se marca, el presupuesto viaja dentro de la invitación por email.
  // Solo aplica al CREAR (las ediciones no reenvían invitaciones). Default off
  // por privacidad: el presupuesto no sale salvo decisión explícita.
  const [incluirPresupuesto, setIncluirPresupuesto] = useState(false)
  const [ubicacion, setUbicacion] = useState(eventoAEditar?.ubicacion || '')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [calendarioId, setCalendarioId] = useState(
    eventoAEditar?.calendarioId || calendarios[0]?.id || ''
  )
  const [colorEvento, setColorEvento] = useState(
    eventoAEditar?.color ||
      calendarios.find((c) => c.id === (eventoAEditar?.calendarioId || calendarios[0]?.id))?.color ||
      '#1a73e8'
  )

  // Estados para fecha inicio/fin y hora.
  const [fechaInicio, setFechaInicio] = useState(
    eventoAEditar?.fechaInicio || eventoAEditar?.fecha || fechaSeleccionada || new Date().toISOString().split('T')[0]
  )
  const [fechaFin, setFechaFin] = useState(
    eventoAEditar?.fechaFin || eventoAEditar?.fecha || fechaSeleccionada || new Date().toISOString().split('T')[0]
  )
  const [hora, setHora] = useState(eventoAEditar?.hora || '12:00')
  const [todoElDia, setTodoElDia] = useState(eventoAEditar?.todoElDia ?? !eventoAEditar?.hora)
  const [mostrarHora, setMostrarHora] = useState(!!eventoAEditar?.hora)

  // Recurrencia: objeto {tipo, intervalo, unidad, hasta}. tipo 'none' = no se repite.
  const [recurrencia, setRecurrencia] = useState(
    eventoAEditar?.recurrencia || { tipo: 'none', intervalo: 1, unidad: 'semana', hasta: null }
  )
  const [menuRecurrenciaAbierto, setMenuRecurrenciaAbierto] = useState(false)

  // Errores de validación por campo: { titulo, fechaFin, hora, ... }.
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [errorSubmit, setErrorSubmit] = useState('')

  useEffect(() => {
    if (!eventoAEditar) {
      const cal = calendarios.find((c) => c.id === calendarioId)
      if (cal) setColorEvento(cal.color)
    }
  }, [calendarioId, calendarios, eventoAEditar])

  const [invitados, setInvitados] = useState(eventoAEditar?.invitados || [])
  const [busquedaInvitado, setBusquedaInvitado] = useState('')
  const [sugerenciasUsuarios, setSugerenciasUsuarios] = useState([])
  const [buscandoUsuarios, setBuscandoUsuarios] = useState(false)
  // Historial propio de emails ya invitados a mano (localStorage, ver arriba).
  const [historialInvitados] = useState(leerHistorialInvitados)
  const [sugerenciasHistorial, setSugerenciasHistorial] = useState([])
  // Estado de verificación de dominio para un email tipeado a mano:
  // null | 'verificando' | { formatoValido, dominioExiste }
  const [estadoEmailLibre, setEstadoEmailLibre] = useState(null)

  const searchRef = useRef(null)
  const [posUbicacion, setPosUbicacion] = useState(null)
  const userSearchRef = useRef(null)
  const recurrenciaRef = useRef(null)
  // Tras elegir una dirección, evita que el efecto reabra el dropdown.
  const ubicacionElegidaRef = useRef(eventoAEditar?.ubicacion || '')

  // Cerrar con la tecla Escape.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Cerrar el desplegable de recurrencia al hacer clic fuera de él.
  useEffect(() => {
    if (!menuRecurrenciaAbierto) return
    const onClickFuera = (e) => {
      if (recurrenciaRef.current && !recurrenciaRef.current.contains(e.target)) {
        setMenuRecurrenciaAbierto(false)
      }
    }
    window.addEventListener('mousedown', onClickFuera)
    return () => window.removeEventListener('mousedown', onClickFuera)
  }, [menuRecurrenciaAbierto])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (
        ubicacion.length > 3 &&
        ubicacion !== ubicacionElegidaRef.current &&
        !sugerencias.some((s) => s.display_name === ubicacion) &&
        ubicacion !== eventoAEditar?.ubicacion
      ) {
        setBuscando(true)
        try {
          const res = await fetch(`${API_URL}/api/buscar-direccion?q=${encodeURIComponent(ubicacion)}`)
          const data = await res.json()
          setSugerencias(Array.isArray(data) ? data : [])
        } catch (error) {
          console.error('Error buscando direcciones:', error)
          setSugerencias([])
        } finally {
          setBuscando(false)
        }
      } else if (ubicacion.length <= 3) {
        setSugerencias([])
      }
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [ubicacion, eventoAEditar])

  // Posiciona el dropdown de ubicación (renderizado en portal sobre document.body)
  // justo debajo del input, sin que el overflow del form lo recorte.
  useEffect(() => {
    if (sugerencias.length === 0) return
    const actualizar = () => {
      const el = searchRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setPosUbicacion({ top: r.bottom + 8, left: r.left, width: r.width })
    }
    actualizar()
    window.addEventListener('scroll', actualizar, true)
    window.addEventListener('resize', actualizar)
    return () => {
      window.removeEventListener('scroll', actualizar, true)
      window.removeEventListener('resize', actualizar)
    }
  }, [sugerencias.length])

  useEffect(() => {
    const termino = busquedaInvitado.trim().toLowerCase()

    const buscarUsuarios = async () => {
      if (busquedaInvitado.length < 2) {
        setSugerenciasUsuarios([])
        setSugerenciasHistorial([])
        setEstadoEmailLibre(null)
        return
      }

      // Coincidencias del historial propio: no requieren red, se filtran ya.
      setSugerenciasHistorial(
        historialInvitados
          .filter((email) => email.includes(termino) && email !== termino && !invitados.some((i) => i.email?.toLowerCase() === email))
          .slice(0, 5)
      )

      setBuscandoUsuarios(true)
      try {
        const q = query(
          collection(db, 'users'),
          where('email', '>=', busquedaInvitado),
          where('email', '<=', busquedaInvitado + ''),
          limit(5)
        )
        const querySnapshot = await getDocs(q)
        const users = []
        querySnapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() })
        })
        setSugerenciasUsuarios(users.filter((u) => !invitados.some((i) => i.id === u.id)))
      } catch (error) {
        console.error('Error buscando usuarios:', error)
      } finally {
        setBuscandoUsuarios(false)
      }

      // Si lo tipeado ya tiene forma de email completo y no está invitado
      // todavía, chequeamos contra el backend si el dominio existe de
      // verdad (DNS MX/A) antes de dejar invitar a ciegas.
      if (REGEX_EMAIL_CLIENTE.test(termino) && !invitados.some((i) => i.email?.toLowerCase() === termino)) {
        setEstadoEmailLibre('verificando')
        try {
          const res = await fetch(`${API_URL}/api/verificar-email?email=${encodeURIComponent(termino)}`)
          const data = await res.json()
          setEstadoEmailLibre(data)
        } catch (error) {
          console.error('Error verificando email:', error)
          setEstadoEmailLibre(null)
        }
      } else {
        setEstadoEmailLibre(null)
      }
    }
    const timer = setTimeout(buscarUsuarios, 300)
    return () => clearTimeout(timer)
  }, [busquedaInvitado, invitados, historialInvitados])

  const seleccionarSugerencia = (sug) => {
    ubicacionElegidaRef.current = sug.display_name
    setUbicacion(sug.display_name)
    setSugerencias([])
  }

  // Elige un tipo de recurrencia del desplegable y lo cierra. Garantiza que
  // intervalo/unidad/hasta siempre tengan valor (evita el <select> no controlado
  // al pasar de un preset a "Personalizado").
  const seleccionarRecurrencia = (tipo) => {
    setRecurrencia((prev) => ({
      intervalo: prev.intervalo || 1,
      unidad: prev.unidad || 'semana',
      hasta: prev.hasta ?? null,
      tipo,
    }))
    setMenuRecurrenciaAbierto(false)
  }

  // Etiqueta a mostrar en el botón del desplegable según el tipo elegido.
  const etiquetaRecurrenciaActual =
    TIPOS_RECURRENCIA.find((t) => t.tipo === recurrencia.tipo)?.etiqueta || 'No se repite'

  const agregarInvitado = (usuarioInvitado) => {
    setInvitados([...invitados, usuarioInvitado])
    setBusquedaInvitado('')
    setSugerenciasUsuarios([])
    setSugerenciasHistorial([])
    setEstadoEmailLibre(null)
    if (usuarioInvitado.email) guardarEnHistorialInvitados(usuarioInvitado.email)
  }

  // Invita a un email tipeado a mano que NO es un usuario registrado en la
  // app (ej. un invitado externo). No tiene `name`: no inventamos datos.
  const agregarInvitadoLibre = (email) => {
    const limpio = email.trim()
    agregarInvitado({ id: limpio, email: limpio, name: null })
  }

  const eliminarInvitado = (id) => {
    setInvitados(invitados.filter((i) => i.id !== id))
  }

  // Valida en blur del título (sin molestar en cada tecla).
  const validarTituloEnBlur = () => {
    const limpio = sanitizarTexto(titulo, LIMITES.titulo)
    if (limpio.length === 0) {
      setErrores((prev) => ({ ...prev, titulo: 'El título es obligatorio.' }))
    } else {
      setErrores((prev) => {
        if (!prev.titulo) return prev
        const resto = { ...prev }
        delete resto.titulo
        return resto
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (soloLectura) return
    setErrorSubmit('')

    // Aseguramos que calendarioId no esté vacío.
    const finalCalendarioId = calendarioId || calendarios[0]?.id
    if (!finalCalendarioId) {
      setErrorSubmit('No hay calendarios disponibles.')
      return
    }

    // Saneamos los textos libres antes de validar/guardar.
    const tituloLimpio = sanitizarTexto(titulo, LIMITES.titulo)
    const descripcionLimpia = sanitizarTexto(descripcion, LIMITES.descripcion)
    const ubicacionLimpia = sanitizarTexto(ubicacion, LIMITES.ubicacion)
    const precioLimpio = sanitizarTexto(precio, LIMITES.presupuesto)

    // Recurrencia normalizada para Firestore (sin `undefined`): null si no se repite.
    const recurrenciaFinal =
      recurrencia.tipo === 'none'
        ? null
        : recurrencia.tipo === 'personalizada'
          ? {
              tipo: 'personalizada',
              intervalo: Math.max(1, parseInt(recurrencia.intervalo, 10) || 1),
              unidad: recurrencia.unidad || 'semana',
              hasta: recurrencia.hasta || null,
            }
          : { tipo: recurrencia.tipo, intervalo: 1, hasta: recurrencia.hasta || null }

    const datosEvento = {
      titulo: tituloLimpio,
      descripcion: descripcionLimpia,
      precio: precioLimpio, // El contexto lo separa hacia `presupuestos`.
      ubicacion: ubicacionLimpia,
      calendarioId: finalCalendarioId,
      color: colorEvento,
      fechaInicio,
      fechaFin,
      fecha: fechaInicio, // Retrocompatibilidad.
      hora: todoElDia ? null : hora,
      todoElDia,
      recurrencia: recurrenciaFinal,
      invitados,
      incluirPresupuesto,
    }

    // Validación local: mostramos errores inline y no enviamos si falla.
    const { valido, errores: erroresValidacion } = validarEvento(datosEvento)
    if (!valido) {
      setErrores(erroresValidacion)
      return
    }
    setErrores({})

    setGuardando(true)
    try {
      if (eventoAEditar) {
        await editarEvento(eventoAEditar.id, datosEvento)
      } else {
        await agregarEvento(datosEvento)
      }
      onClose()
    } catch (error) {
      console.error('Error al guardar el evento:', error)
      // El contexto puede lanzar un Error de validación con mensaje legible.
      setErrorSubmit(error?.message || 'Hubo un error al guardar el evento.')
    } finally {
      setGuardando(false)
    }
  }

  // Helper para renderizar un mensaje de error inline bajo un campo.
  // Es una función que devuelve JSX (NO un componente) para no recrear
  // un componente en cada render.
  const renderError = (mensaje) =>
    mensaje ? (
      <p className="text-xs text-[var(--danger-color)] mt-2 font-medium">{mensaje}</p>
    ) : null

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={eventoAEditar ? 'Editar evento' : 'Nuevo evento'}
      variants={scrimVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-[640px] max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        variants={popVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header con título */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-color)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {eventoAEditar ? 'Editar evento' : 'Nuevo evento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex items-center justify-center w-11 h-11 -mr-2 hover:bg-[var(--hover-color)] rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
          <motion.div
            className="px-6 py-4 divide-y divide-[var(--border-color)]"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Título */}
            <motion.div className="relative group" variants={fadeUpItem}>
              <input
                autoFocus={!soloLectura}
                type="text"
                placeholder="Título del evento"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={validarTituloEnBlur}
                disabled={soloLectura}
                maxLength={LIMITES.titulo}
                aria-invalid={!!errores.titulo}
                className="w-full text-xl font-semibold tracking-tight border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] bg-transparent py-1 disabled:opacity-70"
              />
              <div
                className={`h-[2px] w-full mt-3 transition-colors duration-150 ${
                  errores.titulo
                    ? 'bg-[var(--danger-color)]'
                    : 'bg-[var(--border-color)] group-focus-within:bg-[var(--accent-color)]'
                }`}
              />
              {renderError(errores.titulo)}
            </motion.div>

            <motion.div
              className="space-y-1.5"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {/* Rango de fechas + lógica de horas */}
              <motion.div className="flex flex-col gap-3 py-1.5" variants={fadeUpItem}>
                <div className="flex items-start gap-4">
                  <div className="w-6 flex justify-center text-[var(--text-secondary)] pt-3">
                    <Clock size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 items-center text-[var(--text-primary)]">
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        disabled={soloLectura}
                        className="hover:bg-[var(--hover-color)] border border-[var(--border-color)] rounded-lg px-4 min-h-[40px] text-[15px] outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors cursor-pointer bg-[var(--bg-primary)] font-medium disabled:opacity-70 disabled:cursor-default"
                      />
                      <span className="text-[var(--text-tertiary)]">→</span>
                      <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        disabled={soloLectura}
                        aria-invalid={!!errores.fechaFin}
                        className={`hover:bg-[var(--hover-color)] border rounded-lg px-4 min-h-[40px] text-[15px] outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors cursor-pointer bg-[var(--bg-primary)] font-medium disabled:opacity-70 disabled:cursor-default ${
                          errores.fechaFin
                            ? 'border-[var(--danger-color)]'
                            : 'border-[var(--border-color)] focus:border-[var(--accent-color)]'
                        }`}
                      />
                    </div>
                    {renderError(errores.fechaFin)}
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-10">
                  {!mostrarHora ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarHora(true)
                        setTodoElDia(false)
                      }}
                      disabled={soloLectura}
                      className="mt-2 mb-1 inline-flex items-center justify-center gap-2 px-4 min-h-[40px] border border-[var(--border-color)] rounded-[var(--radius-md)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-color)] active:scale-[0.98] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                    >
                      <Plus size={18} />
                      Añadir hora
                    </button>
                  ) : (
                    <div className="flex items-center gap-4 animate-fade-in">
                      <div>
                        <input
                          type="time"
                          value={hora}
                          onChange={(e) => setHora(e.target.value)}
                          disabled={soloLectura}
                          aria-invalid={!!errores.hora}
                          className={`hover:bg-[var(--hover-color)] border rounded-lg px-4 min-h-[40px] text-[15px] outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors cursor-pointer bg-[var(--bg-primary)] font-medium tabular-nums disabled:opacity-70 ${
                            errores.hora
                              ? 'border-[var(--danger-color)]'
                              : 'border-[var(--border-color)] focus:border-[var(--accent-color)]'
                          }`}
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={todoElDia}
                          onChange={(e) => {
                            setTodoElDia(e.target.checked)
                            if (e.target.checked) setMostrarHora(false)
                          }}
                          disabled={soloLectura}
                          className="w-4 h-4 rounded border-[var(--border-color)] accent-[var(--accent-color)]"
                        />
                        <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                          Todo el día
                        </span>
                      </label>
                    </div>
                  )}
                </div>
                {renderError(errores.hora)}
              </motion.div>

              {/* Repetir evento */}
              <motion.div className={`py-1.5 flex items-start gap-4 relative ${menuRecurrenciaAbierto ? 'z-30' : ''}`} variants={fadeUpItem}>
                <div className="w-6 flex justify-center pt-3 text-[var(--text-secondary)]">
                  <Repeat size={20} />
                </div>
                <div className="flex-1 relative" ref={recurrenciaRef}>
                  <button
                    type="button"
                    onClick={() => setMenuRecurrenciaAbierto((v) => !v)}
                    disabled={soloLectura}
                    aria-haspopup="listbox"
                    aria-expanded={menuRecurrenciaAbierto}
                    className="w-full flex items-center justify-between gap-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 min-h-[40px] text-[15px] font-medium text-[var(--text-primary)] cursor-pointer hover:border-[var(--accent-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors outline-none disabled:opacity-70 disabled:cursor-default"
                  >
                    <span>{etiquetaRecurrenciaActual}</span>
                    <ChevronDown
                      size={16}
                      className={`text-[var(--text-tertiary)] transition-transform duration-150 ${menuRecurrenciaAbierto ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence>
                    {menuRecurrenciaAbierto && (
                      <motion.ul
                        role="listbox"
                        aria-label="Frecuencia de repetición"
                        className="absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] z-[2100] mt-2 py-1 overflow-hidden origin-top"
                        variants={menuVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        {TIPOS_RECURRENCIA.map((opt) => (
                          <li key={opt.tipo}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={recurrencia.tipo === opt.tipo}
                              onClick={() => seleccionarRecurrencia(opt.tipo)}
                              className="w-full text-left px-4 min-h-[40px] flex items-center justify-between gap-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover-color)] transition-colors focus:outline-none focus-visible:bg-[var(--hover-color)]"
                            >
                              <span>{opt.etiqueta}</span>
                              {recurrencia.tipo === opt.tipo && (
                                <Check size={16} className="text-[var(--accent-color)] flex-shrink-0" aria-hidden="true" />
                              )}
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>

                  {/* Panel "Personalizado": cada N días/semanas/meses/años + fin opcional */}
                  <AnimatePresence>
                    {recurrencia.tipo === 'personalizada' && (
                      <motion.div
                        className="mt-3 flex flex-wrap items-center gap-2 text-[15px] text-[var(--text-secondary)]"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                      >
                        <span>Cada</span>
                        <input
                          type="number"
                          min="1"
                          value={recurrencia.intervalo}
                          onChange={(e) => setRecurrencia((p) => ({ ...p, intervalo: e.target.value }))}
                          disabled={soloLectura}
                          aria-label="Intervalo de repetición"
                          className="w-16 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 min-h-[40px] text-[15px] font-medium text-[var(--text-primary)] text-center tabular-nums outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors disabled:opacity-70"
                        />
                        <div className="relative">
                          <select
                            value={recurrencia.unidad}
                            onChange={(e) => setRecurrencia((p) => ({ ...p, unidad: e.target.value }))}
                            disabled={soloLectura}
                            aria-label="Unidad de repetición"
                            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-3 pr-8 min-h-[40px] text-[15px] font-medium text-[var(--text-primary)] appearance-none cursor-pointer outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors disabled:opacity-70"
                          >
                            {UNIDADES_RECURRENCIA.map((u) => (
                              <option key={u.unidad} value={u.unidad}>{u.etiqueta}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" aria-hidden="true" />
                        </div>
                        <div className="w-full flex items-center gap-2 mt-1">
                          <span className="text-sm">Termina</span>
                          <input
                            type="date"
                            value={recurrencia.hasta || ''}
                            min={fechaInicio}
                            onChange={(e) => setRecurrencia((p) => ({ ...p, hasta: e.target.value || null }))}
                            disabled={soloLectura}
                            aria-label="Fecha de fin de la repetición (opcional)"
                            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 min-h-[40px] text-[15px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors cursor-pointer disabled:opacity-70"
                          />
                          {recurrencia.hasta && (
                            <button
                              type="button"
                              onClick={() => setRecurrencia((p) => ({ ...p, hasta: null }))}
                              aria-label="Quitar fecha de fin"
                              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--hover-color)] text-[var(--text-tertiary)] hover:text-[var(--danger-color)] transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {renderError(errores.recurrencia)}
                </div>
              </motion.div>

              {/* Calendario + color */}
              <motion.div className={`flex items-center gap-4 py-1.5 relative ${paletaColorAbierta ? 'z-30' : ''}`} variants={fadeUpItem}>
                <div className="w-6 flex justify-center text-[var(--text-secondary)]">
                  <Calendar size={20} />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="relative flex-1">
                    <select
                      value={calendarioId}
                      onChange={(e) => setCalendarioId(e.target.value)}
                      disabled={soloLectura}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 min-h-[40px] text-[15px] font-medium text-[var(--text-primary)] appearance-none cursor-pointer hover:border-[var(--accent-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors outline-none disabled:opacity-70 disabled:cursor-default"
                    >
                      {calendarios.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  <div className="relative" ref={colorRef}>
                    <button
                      type="button"
                      onClick={() => !soloLectura && setPaletaColorAbierta((v) => !v)}
                      disabled={soloLectura}
                      aria-label="Color del evento"
                      aria-haspopup="true"
                      aria-expanded={paletaColorAbierta}
                      className="h-8 w-8 rounded-full border border-[var(--border-color)] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                      style={{ backgroundColor: colorEvento }}
                    >
                      <Pipette size={14} className="text-white pointer-events-none" />
                    </button>
                    <AnimatePresence>
                      {paletaColorAbierta && (
                        <motion.div
                          role="dialog"
                          aria-label="Elegir color del evento"
                          variants={menuVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          style={{ transformOrigin: 'top right' }}
                          className="absolute right-0 top-full mt-2 z-[2200] w-[248px] p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-[var(--shadow-lg)]"
                        >
                          <SelectorColor value={colorEvento} onChange={setColorEvento} size={22} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Invitados */}
              <motion.div className={`py-1.5 flex items-start gap-4 relative ${(buscandoUsuarios || sugerenciasUsuarios.length > 0 || busquedaInvitado.length >= 2) ? 'z-30' : ''}`} variants={fadeUpItem}>
                <div className="w-6 flex justify-center pt-3 text-[var(--text-secondary)]">
                  <Users size={20} />
                </div>
                <div className="flex-1 space-y-3 relative" ref={userSearchRef}>
                  <input
                    type="text"
                    placeholder="Invitar personas (email)"
                    value={busquedaInvitado}
                    onChange={(e) => setBusquedaInvitado(e.target.value)}
                    disabled={soloLectura}
                    className="linear-input w-full min-h-[40px] px-4 text-[15px]"
                  />
                  <AnimatePresence>
                    {(buscandoUsuarios || sugerenciasUsuarios.length > 0 || busquedaInvitado.length >= 2) && (
                      <motion.div
                        className="absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] z-[2100] mt-2 max-h-56 overflow-y-auto custom-scrollbar origin-top"
                        variants={menuVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        {buscandoUsuarios && (
                          <div className="px-5 py-4 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                            <span className="w-3.5 h-3.5 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin-slow" />
                            Buscando…
                          </div>
                        )}

                        {/* Historial propio: emails que ya invitaste antes y coinciden. */}
                        <AnimatePresence initial={false}>
                          {sugerenciasHistorial.map((email) => (
                            <motion.button
                              type="button"
                              key={`hist-${email}`}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.16 }}
                              onClick={() => agregarInvitadoLibre(email)}
                              className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-[var(--hover-color)] cursor-pointer border-b border-[var(--border-color)] last:border-none focus:outline-none focus-visible:bg-[var(--hover-color)]"
                            >
                              <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-semibold flex-shrink-0">
                                {email[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{email}</span>
                                <span className="text-[11px] text-[var(--text-secondary)] truncate">Ya invitado antes</span>
                              </div>
                              <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-[var(--success-color)] flex-shrink-0">
                                <Check size={16} aria-hidden="true" />
                                Agregar
                              </span>
                            </motion.button>
                          ))}
                        </AnimatePresence>

                        {/* Usuarios registrados en la app que coinciden con lo tipeado. */}
                        <AnimatePresence initial={false}>
                          {sugerenciasUsuarios.map((user) => (
                            <motion.button
                              type="button"
                              key={user.id}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.16 }}
                              onClick={() => agregarInvitado(user)}
                              className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-[var(--hover-color)] cursor-pointer border-b border-[var(--border-color)] last:border-none focus:outline-none focus-visible:bg-[var(--hover-color)]"
                            >
                              <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-color)] text-xs font-semibold flex-shrink-0">
                                {user.email?.[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                  {user.name || 'Usuario'}
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] truncate">
                                  {user.email}
                                </span>
                              </div>
                              <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-[var(--success-color)] flex-shrink-0">
                                <Check size={16} aria-hidden="true" />
                                Agregar
                              </span>
                            </motion.button>
                          ))}
                        </AnimatePresence>

                        {/* Sin coincidencias registradas: ofrecemos invitar el email tal
                            cual, con un chequeo honesto de si el dominio existe (DNS). No
                            prometemos "foto real" ni "verificación 100%" — eso requeriría
                            compilar datos de terceros o un servicio pago, ver nota server. */}
                        {!buscandoUsuarios && sugerenciasUsuarios.length === 0 && sugerenciasHistorial.length === 0 && busquedaInvitado.length >= 2 && (
                          estadoEmailLibre ? (
                            <button
                              type="button"
                              onClick={() => agregarInvitadoLibre(busquedaInvitado.trim())}
                              className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-[var(--hover-color)] cursor-pointer focus:outline-none focus-visible:bg-[var(--hover-color)]"
                            >
                              <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-semibold flex-shrink-0">
                                {busquedaInvitado.trim()[0]?.toUpperCase()}
                              </div>
                              <div className="flex flex-col overflow-hidden flex-1 min-w-0 gap-0.5">
                                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                  {busquedaInvitado.trim()}
                                </span>
                                {estadoEmailLibre === 'verificando' && (
                                  <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                                    <span className="w-2.5 h-2.5 border-2 border-[var(--text-tertiary)] border-t-transparent rounded-full animate-spin-slow" />
                                    Verificando dominio…
                                  </span>
                                )}
                                {estadoEmailLibre !== 'verificando' && estadoEmailLibre.dominioExiste === true && (
                                  <span className="flex items-center gap-1 text-[11px] text-[var(--success-color)]">
                                    <Check size={12} aria-hidden="true" /> Dominio verificado
                                  </span>
                                )}
                                {estadoEmailLibre !== 'verificando' && estadoEmailLibre.dominioExiste === false && (
                                  <span className="flex items-center gap-1 text-[11px] text-[var(--warning-color)]">
                                    <AlertTriangle size={12} aria-hidden="true" /> No pudimos confirmar el dominio
                                  </span>
                                )}
                                {estadoEmailLibre !== 'verificando' && estadoEmailLibre.dominioExiste === null && (
                                  <span className="text-[11px] text-[var(--text-tertiary)]">No se pudo verificar el dominio</span>
                                )}
                              </div>
                              <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-[var(--accent-color)] flex-shrink-0">
                                <Plus size={16} aria-hidden="true" />
                                Invitar
                              </span>
                            </button>
                          ) : (
                            <div className="px-5 py-4 text-xs text-[var(--text-secondary)]">
                              No se encontró a nadie con ese email.
                            </div>
                          )
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {invitados.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {invitados.map((inv) => (
                          <motion.div
                            key={inv.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.18 }}
                            className="flex items-center gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-full pl-3 pr-1.5 py-1 group hover:border-[var(--accent-color)] transition-colors"
                          >
                            <span className="text-xs font-medium text-[var(--text-primary)]">{inv.email}</span>
                            {!soloLectura && (
                              <button
                                type="button"
                                onClick={() => eliminarInvitado(inv.id)}
                                aria-label={`Quitar a ${inv.email}`}
                                className="flex items-center justify-center w-6 h-6 hover:bg-[var(--hover-color)] rounded-full text-[var(--text-secondary)] hover:text-[var(--danger-color)] transition-colors"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Ubicación */}
              <motion.div className={`py-1.5 flex items-start gap-4 relative ${sugerencias.length > 0 ? 'z-30' : ''}`} variants={fadeUpItem}>
                <div className="w-6 flex justify-center pt-3 text-[var(--text-secondary)]">
                  <MapPin size={20} />
                </div>
                <div className="flex-1 relative" ref={searchRef}>
                  <input
                    type="text"
                    placeholder="Añadir ubicación"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    disabled={soloLectura}
                    maxLength={LIMITES.ubicacion}
                    aria-invalid={!!errores.ubicacion}
                    className="linear-input w-full min-h-[40px] px-4 text-[15px]"
                  />
                  {buscando && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin-slow" />
                  )}
                  {createPortal(
                    <AnimatePresence>
                      {sugerencias.length > 0 && posUbicacion && (
                        <motion.div
                          style={{ position: 'fixed', top: posUbicacion.top, left: posUbicacion.left, width: posUbicacion.width }}
                          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] z-[9999] max-h-56 overflow-y-auto custom-scrollbar origin-top"
                          variants={menuVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                        >
                          {sugerencias.map((sug, i) => (
                            <div
                              key={i}
                              onClick={() => seleccionarSugerencia(sug)}
                              className="px-5 py-3 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-color)] cursor-pointer border-b border-[var(--border-color)] last:border-none transition-colors"
                            >
                              {sug.display_name}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>,
                    document.body
                  )}
                  {renderError(errores.ubicacion)}
                </div>
              </motion.div>

              {/* Descripción */}
              <motion.div className="flex items-start gap-4 py-1.5" variants={fadeUpItem}>
                <div className="w-6 flex justify-center pt-3 text-[var(--text-secondary)]">
                  <AlignLeft size={20} />
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder="Notas adicionales..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    disabled={soloLectura}
                    maxLength={LIMITES.descripcion}
                    aria-invalid={!!errores.descripcion}
                    className="linear-input w-full min-h-[112px] px-4 py-3 text-[15px] resize-none"
                  />
                  {renderError(errores.descripcion)}
                </div>
              </motion.div>

              {/* Presupuesto — SOLO admin */}
              {isAdmin && (
                <motion.div className="py-1.5" variants={fadeUpItem}>
                  <div className="flex items-start gap-4">
                    <div className="w-6 flex justify-center pt-3 text-[var(--text-secondary)]">
                      <Banknote size={20} />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Información de presupuesto"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        maxLength={LIMITES.presupuesto}
                        className="linear-input w-full min-h-[40px] px-4 text-[15px] font-medium"
                      />
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
                        Solo visible para administradores.
                      </p>
                      {!eventoAEditar && invitados.length > 0 && precio.trim() && (
                        <label className="flex items-center gap-2 cursor-pointer group mt-3">
                          <input
                            type="checkbox"
                            checked={incluirPresupuesto}
                            onChange={(e) => setIncluirPresupuesto(e.target.checked)}
                            className="w-4 h-4 rounded border-[var(--border-color)] accent-[var(--accent-color)] flex-shrink-0"
                          />
                          <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                            Incluir el presupuesto en la invitación por email
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Footer */}
          <div className="py-4 px-6 flex items-center justify-between gap-4 bg-[var(--bg-secondary)] sticky bottom-0 border-t border-[var(--border-color)]">
            <div className="min-w-0 flex-1">
              <AnimatePresence>
                {errorSubmit && (
                  <motion.p
                    className="text-xs text-[var(--danger-color)] font-medium truncate"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                  >
                    {errorSubmit}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 min-h-[40px] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] active:scale-[0.98] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] rounded-[var(--radius-md)]"
              >
                {soloLectura ? 'Cerrar' : 'Cancelar'}
              </button>
              {!soloLectura && (
                <motion.button
                  type="submit"
                  disabled={guardando}
                  whileTap={guardando ? undefined : tap}
                  className="inline-flex items-center justify-center gap-2 px-5 min-h-[40px] bg-[var(--accent-color)] text-[var(--accent-contrast)] text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={guardando ? 'guardando' : 'idle'}
                      className="inline-flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                      transition={{ duration: 0.15 }}
                    >
                      {guardando && (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin-slow" />
                      )}
                      {guardando ? 'Guardando...' : eventoAEditar ? 'Guardar cambios' : 'Crear evento'}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default ModalEvento
