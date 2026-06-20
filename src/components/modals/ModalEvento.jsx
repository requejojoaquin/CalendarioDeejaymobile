import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCalendario } from '../../context/CalendarioContext'
import { useAuth } from '../../context/AuthContext'
import { esAdmin } from '../../utils/permisos'
import { validarEvento, sanitizarTexto, LIMITES } from '../../utils/validacion'
import { db } from '../../services/firebase'
import { collection, query, getDocs, where, limit } from 'firebase/firestore'
import { scrimVariants, popVariants, staggerContainer, fadeUpItem, menuVariants, tap } from '../../lib/motion'
import {
  Clock,
  MapPin,
  AlignLeft,
  Banknote,
  Users,
  Check,
  Calendar,
  Plus,
  X,
} from 'lucide-react'

// URL del backend (con fallback a localhost para desarrollo).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function ModalEvento({ onClose, fechaSeleccionada, eventoAEditar }) {
  const { calendarios, agregarEvento, editarEvento, getPresupuesto } = useCalendario()
  const { rol } = useAuth()
  const isAdmin = esAdmin(rol)
  // Defensa por rol: si no es admin nunca debería abrirse en modo edición,
  // pero por las dudas mostramos todo en modo lectura y ocultamos Guardar.
  const soloLectura = !isAdmin

  const [titulo, setTitulo] = useState(eventoAEditar?.titulo || '')
  const [descripcion, setDescripcion] = useState(eventoAEditar?.descripcion || '')
  // El presupuesto ya NO vive en el doc del evento: se lee del contexto.
  const [precio, setPrecio] = useState(
    eventoAEditar ? getPresupuesto(eventoAEditar.id) || '' : ''
  )
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

  const searchRef = useRef(null)
  const userSearchRef = useRef(null)
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

  useEffect(() => {
    if (busquedaInvitado.length < 2) {
      setSugerenciasUsuarios([])
      return
    }
    const buscarUsuarios = async () => {
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
    }
    const timer = setTimeout(buscarUsuarios, 300)
    return () => clearTimeout(timer)
  }, [busquedaInvitado, invitados])

  const seleccionarSugerencia = (sug) => {
    ubicacionElegidaRef.current = sug.display_name
    setUbicacion(sug.display_name)
    setSugerencias([])
  }

  const agregarInvitado = (usuarioInvitado) => {
    setInvitados([...invitados, usuarioInvitado])
    setBusquedaInvitado('')
    setSugerenciasUsuarios([])
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
      invitados,
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
      <p className="text-xs text-[var(--danger-color)] mt-1.5 font-medium">{mensaje}</p>
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
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] w-full max-w-[560px] max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        variants={popVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header con título */}
        <div className="px-7 py-4 flex items-center justify-between border-b border-[var(--border-color)]">
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
            className="p-7 space-y-7"
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
              className="space-y-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {/* Rango de fechas + lógica de horas */}
              <motion.div className="flex flex-col gap-3" variants={fadeUpItem}>
                <div className="flex items-start gap-4">
                  <div className="w-6 flex justify-center text-[var(--text-secondary)] pt-3">
                    <Clock size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2.5 items-center text-[var(--text-primary)]">
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        disabled={soloLectura}
                        className="hover:bg-[var(--hover-color)] border border-[var(--border-color)] rounded-lg px-3.5 min-h-[44px] text-[15px] outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors cursor-pointer bg-[var(--bg-primary)] font-medium disabled:opacity-70 disabled:cursor-default"
                      />
                      <span className="text-[var(--text-tertiary)]">→</span>
                      <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        disabled={soloLectura}
                        aria-invalid={!!errores.fechaFin}
                        className={`hover:bg-[var(--hover-color)] border rounded-lg px-3.5 min-h-[44px] text-[15px] outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors cursor-pointer bg-[var(--bg-primary)] font-medium disabled:opacity-70 disabled:cursor-default ${
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
                      className="inline-flex items-center justify-center gap-2 px-4 min-h-[40px] border border-[var(--border-color)] rounded-[var(--radius-md)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-color)] active:scale-[0.98] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
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
                          className={`hover:bg-[var(--hover-color)] border rounded-lg px-3.5 min-h-[44px] text-[15px] outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors cursor-pointer bg-[var(--bg-primary)] font-medium tabular-nums disabled:opacity-70 ${
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

              {/* Calendario + color */}
              <motion.div className="flex items-center gap-4" variants={fadeUpItem}>
                <div className="w-6 flex justify-center text-[var(--text-secondary)]">
                  <Calendar size={20} />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="relative flex-1">
                    <select
                      value={calendarioId}
                      onChange={(e) => setCalendarioId(e.target.value)}
                      disabled={soloLectura}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3.5 min-h-[44px] text-[15px] font-medium text-[var(--text-primary)] appearance-none cursor-pointer hover:border-[var(--accent-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-colors outline-none disabled:opacity-70 disabled:cursor-default"
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

                  <div className="relative">
                    <div
                      className="h-11 w-11 rounded-full border border-[var(--border-color)] cursor-pointer transition-colors relative overflow-hidden"
                      style={{ backgroundColor: colorEvento }}
                    >
                      <input
                        type="color"
                        value={colorEvento}
                        onChange={(e) => setColorEvento(e.target.value)}
                        disabled={soloLectura}
                        className="absolute inset-0 opacity-0 cursor-pointer scale-[5] disabled:cursor-default"
                        title="Personalizar color del evento"
                        aria-label="Color del evento"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Invitados */}
              <motion.div className="flex items-start gap-4 relative" variants={fadeUpItem}>
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
                    className="linear-input w-full min-h-[44px] px-3.5 text-[15px]"
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
                          <div className="px-5 py-4 flex items-center gap-2.5 text-xs font-medium text-[var(--text-secondary)]">
                            <span className="w-3.5 h-3.5 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin-slow" />
                            Buscando…
                          </div>
                        )}
                        {!buscandoUsuarios && sugerenciasUsuarios.length === 0 && busquedaInvitado.length >= 2 && (
                          <div className="px-5 py-4 text-xs text-[var(--text-secondary)]">
                            No se encontró a nadie con ese email.
                          </div>
                        )}
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
              <motion.div className="flex items-start gap-4 relative" variants={fadeUpItem}>
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
                    className="linear-input w-full min-h-[44px] px-3.5 text-[15px]"
                  />
                  {buscando && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin-slow" />
                  )}
                  <AnimatePresence>
                    {sugerencias.length > 0 && (
                      <motion.div
                        className="absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] z-50 mt-2 max-h-56 overflow-y-auto custom-scrollbar origin-top"
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
                  </AnimatePresence>
                  {renderError(errores.ubicacion)}
                </div>
              </motion.div>

              {/* Descripción */}
              <motion.div className="flex items-start gap-4" variants={fadeUpItem}>
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
                    className="linear-input w-full min-h-[112px] px-3.5 py-3 text-[15px] resize-none"
                  />
                  {renderError(errores.descripcion)}
                </div>
              </motion.div>

              {/* Presupuesto — SOLO admin */}
              {isAdmin && (
                <motion.div className="pt-5 border-t border-[var(--border-color)]" variants={fadeUpItem}>
                  <div className="flex items-start gap-4">
                    <div className="w-6 flex justify-center pt-3 text-[var(--success-color)]">
                      <Banknote size={20} />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Información de presupuesto"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        maxLength={LIMITES.presupuesto}
                        className="linear-input w-full min-h-[44px] px-3.5 text-[15px] font-medium"
                      />
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
                        Solo visible para administradores.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Footer */}
          <div className="p-5 px-7 flex items-center justify-between gap-4 bg-[var(--bg-secondary)] sticky bottom-0 border-t border-[var(--border-color)]">
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
                  className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] bg-[var(--accent-color)] text-[var(--accent-contrast)] text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
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
